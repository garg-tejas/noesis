import { NextRequest, NextResponse } from "next/server"
import { findContradictions } from "@/services/geminiService"
import { appendContradictionNote } from "@/services/storageService"
import { createClient } from "@/lib/supabase/server"
import type { KnowledgeEntry } from "@/types"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { entries } = body

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Missing or invalid entries array" },
        { status: 400 }
      )
    }

    const entriesMap = new Map<string, KnowledgeEntry>()
    ;(entries as KnowledgeEntry[]).forEach((entry) => {
      entriesMap.set(entry.id, entry)
    })

    const contradictions = await findContradictions(
      entries as KnowledgeEntry[],
      apiKey
    )

    console.log(`Found ${contradictions.length} contradictions across ${entries.length} entries`)

    // Save contradiction notes to both entries involved
    const supabase = await createClient()
    
    for (const contradiction of contradictions) {
      const entry1 = entriesMap.get(contradiction.item1_id)
      const entry2 = entriesMap.get(contradiction.item2_id)

      if (entry1 && entry2) {
        try {
          // Add note to entry1 about entry2
          await appendContradictionNote(
            entry1.id,
            entry2.id,
            contradiction.description,
            entry2.author,
            supabase
          )

          // Add note to entry2 about entry1
          await appendContradictionNote(
            entry2.id,
            entry1.id,
            contradiction.description,
            entry1.author,
            supabase
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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to analyze contradictions",
      },
      { status: 500 }
    )
  }
}

