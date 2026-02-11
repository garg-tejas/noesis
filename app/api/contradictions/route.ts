import { NextRequest, NextResponse } from "next/server"
import { AIServiceError, findContradictions } from "@/services/geminiService"
import {
  appendContradictionNote,
  getEntriesByIdsForUser,
  saveContradictionsForUser,
} from "@/services/storageService"
import { createClient } from "@/lib/supabase/server"
import { contradictionsRequestSchema } from "@/lib/validations"
import type { KnowledgeEntry } from "@/types"
import { errorResponse } from "@/lib/api/errors"
import { consumeRateLimit, getClientIp } from "@/lib/api/rate-limit"
import { createRouteLogger } from "@/lib/api/server-log"

const CONTRADICTION_RATE_LIMIT_MAX_REQUESTS = Number.parseInt(
  process.env.CONTRADICTION_RATE_LIMIT_MAX_REQUESTS || "5",
  10
)
const CONTRADICTION_RATE_LIMIT_WINDOW_MS = Number.parseInt(
  process.env.CONTRADICTION_RATE_LIMIT_WINDOW_MS || "300000",
  10
)

export async function POST(request: NextRequest) {
  const log = createRouteLogger("/api/contradictions")
  log.info("request.received")

  const supabaseClient = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser()

  if (authError || !user) {
    log.warn("auth.failed", { durationMs: log.elapsedMs() })
    return errorResponse(401, "UNAUTHORIZED", "Authentication required")
  }

  const rateLimitResult = consumeRateLimit({
    namespace: "api:contradictions",
    key: `${user.id}:${getClientIp(request)}`,
    limit: CONTRADICTION_RATE_LIMIT_MAX_REQUESTS,
    windowMs: CONTRADICTION_RATE_LIMIT_WINDOW_MS,
  })
  if (!rateLimitResult.allowed) {
    log.warn("rate_limit.blocked", {
      userId: user.id,
      retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      durationMs: log.elapsedMs(),
    })
    return errorResponse(
      429,
      "RATE_LIMITED",
      "Too many contradiction analysis requests. Please wait before retrying.",
      {
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
        limit: rateLimitResult.limit,
        windowMs: rateLimitResult.windowMs,
      },
      { "Retry-After": rateLimitResult.retryAfterSeconds.toString() }
    )
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      log.error("config.missing_gemini_api_key", "GEMINI_API_KEY is not configured", {
        userId: user.id,
        durationMs: log.elapsedMs(),
      })
      return errorResponse(500, "CONFIG_ERROR", "GEMINI_API_KEY is not configured")
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      log.warn("request.bad_json", {
        userId: user.id,
        durationMs: log.elapsedMs(),
      })
      return errorResponse(400, "BAD_REQUEST", "Malformed JSON body")
    }

    const parseResult = contradictionsRequestSchema.safeParse(body)
    if (!parseResult.success) {
      const flattenedErrors = parseResult.error.flatten()
      const receivedEntriesCount = Array.isArray((body as { entryIds?: unknown[] })?.entryIds)
        ? (body as { entryIds?: unknown[] }).entryIds!.length
        : 0
      log.warn("request.validation_failed", {
        userId: user.id,
        receivedEntriesCount,
        durationMs: log.elapsedMs(),
      })
      
      return errorResponse(
        400,
        "VALIDATION_FAILED",
        "Validation failed",
        flattenedErrors
      )
    }

    const { entryIds } = parseResult.data
    const uniqueEntryIds = Array.from(new Set(entryIds))
    const entries = await getEntriesByIdsForUser(
      uniqueEntryIds,
      user.id,
      supabaseClient
    )

    if (entries.length !== uniqueEntryIds.length) {
      log.warn("ownership.failed", {
        userId: user.id,
        requestedEntries: uniqueEntryIds.length,
        accessibleEntries: entries.length,
        durationMs: log.elapsedMs(),
      })
      return errorResponse(
        403,
        "FORBIDDEN",
        "One or more entries are inaccessible for this user"
      )
    }

    const entriesMap = new Map<string, KnowledgeEntry>()
    entries.forEach((entry) => {
      entriesMap.set(entry.id, entry)
    })

    const contradictions = await findContradictions(
      entries,
      apiKey
    )

    const validContradictions = contradictions.filter(
      (contradiction) =>
        contradiction.item1_id !== contradiction.item2_id &&
        entriesMap.has(contradiction.item1_id) &&
        entriesMap.has(contradiction.item2_id)
    )
    const droppedContradictions = contradictions.length - validContradictions.length

    const persistence = await saveContradictionsForUser(
      validContradictions,
      user.id,
      supabaseClient
    )

    for (const contradiction of validContradictions) {
      const entry1 = entriesMap.get(contradiction.item1_id)
      const entry2 = entriesMap.get(contradiction.item2_id)

      if (entry1 && entry2) {
        try {
          await appendContradictionNote(
            entry1.id,
            entry2.id,
            contradiction.description,
            entry2.author,
            supabaseClient
          )

          await appendContradictionNote(
            entry2.id,
            entry1.id,
            contradiction.description,
            entry1.author,
            supabaseClient
          )
        } catch (error) {
          log.error("contradiction_note.append_failed", error, {
            userId: user.id,
            entry1Id: entry1.id,
            entry2Id: entry2.id,
          })
          // Continue with other contradictions even if one fails
        }
      }
    }

    log.info("request.succeeded", {
      userId: user.id,
      requestedEntries: uniqueEntryIds.length,
      modelContradictions: contradictions.length,
      returnedContradictions: validContradictions.length,
      persistedCreated: persistence.created,
      persistedSkipped: persistence.skipped,
      droppedContradictions,
      durationMs: log.elapsedMs(),
    })

    return NextResponse.json({
      contradictions: validContradictions,
      persistence: {
        created: persistence.created,
        skipped: persistence.skipped,
        dropped: droppedContradictions,
      },
    })
  } catch (error) {
    log.error("request.failed", error, {
      userId: user.id,
      durationMs: log.elapsedMs(),
    })
    if (error instanceof AIServiceError) {
      if (error.code === "UPSTREAM_TIMEOUT") {
        return errorResponse(504, "UPSTREAM_TIMEOUT", "AI processing timed out. Please try again.")
      }
      return errorResponse(503, "UPSTREAM_ERROR", "AI service is temporarily unavailable. Please try again.")
    }
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to analyze contradictions"
    )
  }
}
