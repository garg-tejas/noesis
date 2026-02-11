import { z } from "zod"

// Source type enum
export const sourceTypeSchema = z.enum(["twitter", "blog", "youtube", "other"])

// Distill API request schema
export const distillRequestSchema = z
  .object({
    rawText: z.string().max(200000, "Text too long (max 200,000 characters)").optional(),
    sourceType: sourceTypeSchema,
    youtubeUrl: z.string().url().optional(),
  })
  .refine(
    (data) => {
      // For YouTube, either youtubeUrl or rawText must be provided
      if (data.sourceType === "youtube") {
        return !!(data.youtubeUrl || data.rawText)
      }
      // For other sources, rawText is required
      return !!data.rawText
    },
    {
      message: "rawText is required for non-YouTube sources, or provide youtubeUrl for YouTube",
    }
  )

// Distilled content schema (for validation of AI response)
export const distilledContentSchema = z.object({
  core_ideas: z.array(z.string()),
  context: z.string(),
  actionables: z.array(z.string()),
  tags: z.array(z.string()),
  quality_score: z.number().min(0).max(100),
})

// Contradictions API request schema
export const contradictionsRequestSchema = z.object({
  entryIds: z
    .array(z.string().uuid("Invalid entry ID"))
    .min(2, "At least 2 entries required for contradiction detection")
    .max(100, "Too many entries (max 100)")
    .refine((entryIds) => new Set(entryIds).size === entryIds.length, {
      message: "Duplicate entry IDs are not allowed",
    }),
})

// Type exports
export type DistillRequest = z.infer<typeof distillRequestSchema>
export type ContradictionsRequest = z.infer<typeof contradictionsRequestSchema>
