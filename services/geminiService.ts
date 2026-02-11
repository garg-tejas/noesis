import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DistilledContent, SourceType, KnowledgeEntry, Contradiction } from "../types";

// Model configuration - defaults can be overridden via environment variables
const GEMINI_MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-3-flash-preview";
const GEMINI_TIMEOUT_MS = Number.parseInt(process.env.GEMINI_TIMEOUT_MS || "30000", 10);
const GEMINI_MAX_RETRIES = Number.parseInt(process.env.GEMINI_MAX_RETRIES || "2", 10);
const GEMINI_RETRY_BASE_DELAY_MS = Number.parseInt(process.env.GEMINI_RETRY_BASE_DELAY_MS || "750", 10);

export type AIServiceErrorCode = "UPSTREAM_TIMEOUT" | "UPSTREAM_ERROR";

export class AIServiceError extends Error {
  code: AIServiceErrorCode;
  cause?: unknown;

  constructor(code: AIServiceErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "AIServiceError";
    this.code = code;
    this.cause = cause;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isLikelyTimeoutError = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("deadline")
  );
};

const normalizeAIError = (error: unknown, operationName: string): AIServiceError => {
  if (error instanceof AIServiceError) return error;
  const message = error instanceof Error ? error.message : "Unknown AI service error";

  if (isLikelyTimeoutError(message)) {
    return new AIServiceError(
      "UPSTREAM_TIMEOUT",
      `${operationName} timed out`,
      error
    );
  }

  return new AIServiceError(
    "UPSTREAM_ERROR",
    `${operationName} failed: ${message}`,
    error
  );
};

const isRetriableError = (error: unknown): boolean => {
  if (error instanceof AIServiceError && error.code === "UPSTREAM_TIMEOUT") {
    return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (!message) return true;

  const nonRetriableHints = [
    "api key",
    "unauthorized",
    "forbidden",
    "permission",
    "invalid",
    "malformed",
    "schema",
    "not found",
  ];
  if (nonRetriableHints.some((hint) => message.includes(hint))) {
    return false;
  }

  const retriableHints = [
    "timeout",
    "timed out",
    "deadline",
    "429",
    "500",
    "502",
    "503",
    "504",
    "network",
    "econn",
    "temporar",
    "unavailable",
    "rate limit",
    "overload",
  ];
  return retriableHints.some((hint) => message.includes(hint));
};

const withTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new AIServiceError(
          "UPSTREAM_TIMEOUT",
          `${operationName} timed out after ${timeoutMs}ms`
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const runGeminiWithRetry = async <T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> => {
  const maxAttempts = GEMINI_MAX_RETRIES + 1;
  let lastError: AIServiceError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await withTimeout(operation, GEMINI_TIMEOUT_MS, operationName);
    } catch (error) {
      const normalizedError = normalizeAIError(error, operationName);
      lastError = normalizedError;

      const shouldRetry = attempt < maxAttempts - 1 && isRetriableError(error);
      console.error(
        `[Gemini:${operationName}] attempt ${attempt + 1}/${maxAttempts} failed`,
        normalizedError
      );

      if (!shouldRetry) {
        throw normalizedError;
      }

      const backoffMs = GEMINI_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      await sleep(backoffMs);
    }
  }

  throw (
    lastError ??
    new AIServiceError("UPSTREAM_ERROR", `${operationName} failed after retries`)
  );
};

const parseStructuredResponse = <T>(text: string, operationName: string): T => {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new AIServiceError(
      "UPSTREAM_ERROR",
      `${operationName} returned invalid JSON`,
      error
    );
  }
};

// Define the response schema for structured output
const distillationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    core_ideas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of clean, distraction-free core insights extracted from the text.",
    },
    context: {
      type: Type.STRING,
      description: "A brief background explanation of why this content matters.",
    },
    actionables: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Concrete actions the user can take or questions worth thinking about based on this content.",
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of relevant categorization tags (e.g., 'ml', 'systems', 'career').",
    },
    quality_score: {
      type: Type.NUMBER,
      description:
        "A score from 0 to 100 indicating the density and value of the information. 100 is pure signal, 0 is pure noise.",
    },
  },
  required: ["core_ideas", "context", "actionables", "tags", "quality_score"],
};

export const distillContent = async (
  rawText: string | undefined,
  sourceType: SourceType,
  apiKey: string,
  youtubeUrl?: string
): Promise<DistilledContent> => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `
    You are a Personal Knowledge Distiller. Your goal is to extract meaningful signal from noise.
    
    You will be given content from a ${sourceType}.
    
    You MUST:
    1. Discard fluff, intro/outro, ads, and generic platitudes.
    2. Extract only clean, core ideas.
    3. Generate actionable advice or profound questions based on the content.
    4. Assign a quality score (0 - 100). Be harsh. Low effort content gets low scores.
    5. Categorize with relevant tags. Prioritize tags that align with common themes in technology, productivity, and personal development (e.g., 'Optimization', 'Mental Models', 'Career Growth', 'System Design').

    Return the result strictly as JSON.
  `;

  // Build contents array - for YouTube, use fileData with fileUri, otherwise use text
  const contents: Array<{ role?: string; parts: Array<{ text?: string; fileData?: { fileUri: string } }> }> = [];

  if (sourceType === "youtube" && youtubeUrl) {
    // Use direct YouTube link via fileData
    contents.push({
      parts: [
        {
          fileData: {
            fileUri: youtubeUrl,
          },
        },
      ],
    });
  } else if (rawText) {
    contents.push({
      role: "user",
      parts: [{ text: rawText }],
    });
  } else {
    throw new Error("Either rawText or youtubeUrl must be provided");
  }

  try {
    return await runGeminiWithRetry("distillContent", async () => {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: distillationSchema,
          temperature: 0.2, // Low temperature for consistent, analytical output
        },
      });

      const text = response.text;
      if (!text) {
        throw new AIServiceError("UPSTREAM_ERROR", "No response from Gemini.");
      }

      return parseStructuredResponse<DistilledContent>(text, "distillContent");
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw normalizeAIError(error, "distillContent");
  }
};

const contradictionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    contradictions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          item1_id: { type: Type.STRING },
          item2_id: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["item1_id", "item2_id", "description"],
      },
    },
  },
  required: ["contradictions"],
};

/**
 * Groups entries by shared tags to find similar content
 * Only entries with at least one common tag are grouped together
 */
const groupEntriesBySimilarity = (entries: KnowledgeEntry[]): KnowledgeEntry[][] => {
  const groups: KnowledgeEntry[][] = [];
  const processed = new Set<string>();

  const entryTagSets = new Map<string, Set<string>>();
  for (const entry of entries) {
    entryTagSets.set(entry.id, new Set(entry.distilled.tags.map((t) => t.toLowerCase())));
  }

  for (const entry of entries) {
    if (processed.has(entry.id)) continue;

    const entryTags = entryTagSets.get(entry.id)!;
    const similarEntries: KnowledgeEntry[] = [];

    for (const e of entries) {
      if (e.id === entry.id || processed.has(e.id)) continue;

      const otherTags = entryTagSets.get(e.id)!;

      for (const tag of entryTags) {
        if (otherTags.has(tag)) {
          similarEntries.push(e);
          break;
        }
      }

      if (similarEntries.length === 0 || similarEntries[similarEntries.length - 1] !== e) {
        const otherTagStr = Array.from(otherTags).join(" ");

        for (const tag of entryTags) {
          if (otherTagStr.includes(tag) || tag.includes(otherTagStr.split(" ")[0] || "")) {
            similarEntries.push(e);
            break;
          }
        }
      }
    }

    if (similarEntries.length > 0) {
      const group = [entry, ...similarEntries];
      groups.push(group);

      for (const e of group) {
        processed.add(e.id);
      }
    }
  }

  return groups;
};

export const findContradictions = async (
  entries: KnowledgeEntry[],
  apiKey: string
): Promise<Contradiction[]> => {
  if (!apiKey) throw new Error("API Key is missing.");
  if (entries.length < 2) return [];

  const ai = new GoogleGenAI({ apiKey });

  const similarGroups = groupEntriesBySimilarity(entries);

  console.log(`Grouped ${entries.length} entries into ${similarGroups.length} similar groups`);

  // If no similar groups found, return empty (no point checking unrelated content)
  if (similarGroups.length === 0) {
    console.log("No similar entries found for contradiction analysis");
    return [];
  }

  const allContradictions: Contradiction[] = [];
  let analyzedGroups = 0;
  let failedGroups = 0;
  let lastGroupError: AIServiceError | null = null;

  for (let i = 0; i < similarGroups.length; i++) {
    const group = similarGroups[i];

    // Skip groups with only one entry (can't have contradictions)
    if (group.length < 2) {
      console.log(`Skipping group ${i + 1}: only 1 entry`);
      continue;
    }

    analyzedGroups += 1;
    const groupTags = group[0].distilled.tags.filter((tag) =>
      group.every((e) => e.distilled.tags.includes(tag))
    );
    console.log(
      `Analyzing group ${i + 1}: ${group.length} entries with shared tags: ${groupTags.join(", ") || "none"}`
    );

    // Limit group size to avoid context window issues
    const groupToAnalyze = group.slice(0, 20);

    const simplifiedEntries = groupToAnalyze.map((e) => ({
      id: e.id,
      tags: e.distilled.tags,
      core_ideas: e.distilled.core_ideas.join(". "),
      actionables: e.distilled.actionables.join(". "),
      context: e.distilled.context,
    }));

    const sharedTags = groupToAnalyze[0].distilled.tags.filter((tag) =>
      groupToAnalyze.every((e) => e.distilled.tags.includes(tag))
    );

    const prompt = `
    Analyze the following knowledge entries that are related by topic (they share tags: ${sharedTags.join(", ") || "similar themes"}).
    
    IMPORTANT: Only identify contradictions between entries that are discussing the SAME or RELATED topics.
    Do NOT flag contradictions between entries about completely different subjects (e.g., Reinforcement Learning vs Philosophy).
    
    Focus on finding pairs where:
    1. The entries discuss the same topic/domain
    2. The core ideas or actionable advice fundamentally contradict each other
    3. The contradiction is meaningful and not just different perspectives on unrelated topics
    
    Entries:
    ${JSON.stringify(simplifiedEntries, null, 2)}

    Return a JSON object with a list of contradictions. Only include contradictions that are meaningful within the same topic domain.
  `;

    try {
      const contradictionsForGroup = await runGeminiWithRetry(
        `findContradictions-group-${i + 1}`,
        async () => {
          const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              responseMimeType: "application/json",
              responseSchema: contradictionSchema,
              temperature: 0.2,
            },
          });

          const text = response.text;
          if (!text) return [];

          const result = parseStructuredResponse<{ contradictions: Contradiction[] }>(
            text,
            `findContradictions-group-${i + 1}`
          );
          return result.contradictions || [];
        }
      );

      if (contradictionsForGroup.length > 0) {
        console.log(`Found ${contradictionsForGroup.length} contradictions in group ${i + 1}`);
        allContradictions.push(...contradictionsForGroup);
      } else {
        console.log(`No contradictions found in group ${i + 1}`);
      }
    } catch (error) {
      const normalized = normalizeAIError(error, `findContradictions-group-${i + 1}`);
      failedGroups += 1;
      lastGroupError = normalized;
      console.error(`Contradiction Analysis Error for group ${i + 1}:`, normalized);
      // Continue with other groups even if one fails
      continue;
    }
  }

  if (
    analyzedGroups > 0 &&
    failedGroups === analyzedGroups &&
    allContradictions.length === 0 &&
    lastGroupError
  ) {
    throw lastGroupError;
  }

  return allContradictions;
};

