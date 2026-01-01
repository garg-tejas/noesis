import { z } from "zod"

// Source type enum
export const sourceTypeSchema = z.enum(["twitter", "blog", "other"])

// Distill API request schema
export const distillRequestSchema = z.object({
  rawText: z
    .string()
    .min(1, "Raw text is required")
    .max(50000, "Text too long (max 50,000 characters)"),
  sourceType: sourceTypeSchema,
})

// Distilled content schema (for validation of AI response)
export const distilledContentSchema = z.object({
  core_ideas: z.array(z.string()),
  context: z.string(),
  actionables: z.array(z.string()),
  tags: z.array(z.string()),
  quality_score: z.number().min(0).max(100),
})

// Knowledge entry schema (for contradiction detection)
export const knowledgeEntrySchema = z.object({
  id: z.string().uuid(),
  sourceType: sourceTypeSchema,
  originalUrl: z.string(),
  author: z.string(),
  rawText: z.string().optional(),
  distilled: distilledContentSchema,
  createdAt: z.number(),
  isFavorite: z.boolean(),
  userNotes: z.string().optional(),
})

// Contradictions API request schema
export const contradictionsRequestSchema = z.object({
  entries: z
    .array(knowledgeEntrySchema)
    .min(2, "At least 2 entries required for contradiction detection")
    .max(100, "Too many entries (max 100)"),
})

// Type exports
export type DistillRequest = z.infer<typeof distillRequestSchema>
export type ContradictionsRequest = z.infer<typeof contradictionsRequestSchema>
