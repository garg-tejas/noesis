import { NextRequest, NextResponse } from "next/server"
import { findContradictions } from "@/services/geminiService"
import {
  appendContradictionNote,
  getEntriesByIdsForUser,
  saveContradictionsForUser,
} from "@/services/storageService"
import { createClient } from "@/lib/supabase/server"
import { contradictionsRequestSchema } from "@/lib/validations"
import type { KnowledgeEntry } from "@/types"
import { errorResponse } from "@/lib/api/errors"

export async function POST(request: NextRequest) {
  const supabaseClient = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser()

  if (authError || !user) {
    return errorResponse(401, "UNAUTHORIZED", "Authentication required")
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return errorResponse(500, "CONFIG_ERROR", "GEMINI_API_KEY is not configured")
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, "BAD_REQUEST", "Malformed JSON body")
    }

    const parseResult = contradictionsRequestSchema.safeParse(body)
    if (!parseResult.success) {
      const formattedErrors = parseResult.error.format()
      const receivedEntriesCount = Array.isArray((body as { entryIds?: unknown[] })?.entryIds)
        ? (body as { entryIds?: unknown[] }).entryIds!.length
        : 0
      console.error("Contradiction validation failed:", {
        errors: formattedErrors,
        receivedEntriesCount,
        flattenedErrors: parseResult.error.flatten()
      })
      
      return errorResponse(
        400,
        "VALIDATION_FAILED",
        "Validation failed",
        {
          details: formattedErrors,
          fieldErrors: parseResult.error.flatten().fieldErrors,
        }
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

    console.log(`Found ${contradictions.length} contradictions across ${entries.length} entries`)

    const validContradictions = contradictions.filter(
      (contradiction) =>
        contradiction.item1_id !== contradiction.item2_id &&
        entriesMap.has(contradiction.item1_id) &&
        entriesMap.has(contradiction.item2_id)
    )
    const droppedContradictions = contradictions.length - validContradictions.length
    if (droppedContradictions > 0) {
      console.warn(`Dropped ${droppedContradictions} invalid contradictions returned by model`)
    }

    const persistence = await saveContradictionsForUser(
      validContradictions,
      user.id,
      supabaseClient
    )
    console.log(
      `Persisted ${persistence.created} contradictions, skipped ${persistence.skipped} duplicates`
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

          console.log(`Saved contradiction notes to entries ${entry1.id} and ${entry2.id}`)
        } catch (error) {
          console.error(`Failed to save contradiction notes:`, error)
          // Continue with other contradictions even if one fails
        }
      }
    }

    return NextResponse.json({
      contradictions: validContradictions,
      persistence: {
        created: persistence.created,
        skipped: persistence.skipped,
        dropped: droppedContradictions,
      },
    })
  } catch (error) {
    console.error("Contradiction analysis error:", error)
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to analyze contradictions"
    )
  }
}
