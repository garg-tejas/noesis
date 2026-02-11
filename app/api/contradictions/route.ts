import { NextRequest, NextResponse } from "next/server"
import { findContradictions } from "@/services/geminiService"
import { appendContradictionNote } from "@/services/storageService"
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
      const receivedEntriesCount = Array.isArray((body as { entries?: unknown[] })?.entries)
        ? (body as { entries?: unknown[] }).entries!.length
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

    const { entries } = parseResult.data

    const entriesMap = new Map<string, KnowledgeEntry>()
    ;(entries as KnowledgeEntry[]).forEach((entry) => {
      entriesMap.set(entry.id, entry)
    })

    const contradictions = await findContradictions(
      entries as KnowledgeEntry[],
      apiKey
    )

    console.log(`Found ${contradictions.length} contradictions across ${entries.length} entries`)

    for (const contradiction of contradictions) {
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

    return NextResponse.json({ contradictions })
  } catch (error) {
    console.error("Contradiction analysis error:", error)
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to analyze contradictions"
    )
  }
}
