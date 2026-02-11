import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { errorResponse } from "@/lib/api/errors"
import type { ContradictionInsight, KnowledgeEntry } from "@/types"

type ContradictionRow = {
  id: string
  item1_id: string
  item2_id: string
  description: string
  created_at: string
}

type EntryLiteRow = {
  id: string
  author: string
  source_type: KnowledgeEntry["sourceType"]
  distilled: {
    core_ideas?: unknown
  } | null
}

const toSafeLimit = (value: string | null): number => {
  if (!value) return 6
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 6
  return Math.min(Math.max(parsed, 1), 20)
}

const getPrimaryCoreIdea = (distilled: EntryLiteRow["distilled"]): string => {
  const ideas = distilled?.core_ideas
  if (!Array.isArray(ideas)) return "No core idea available"
  const firstIdea = ideas.find((idea) => typeof idea === "string" && idea.trim().length > 0)
  return typeof firstIdea === "string" ? firstIdea.trim() : "No core idea available"
}

export async function GET(request: NextRequest) {
  const supabaseClient = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser()

  if (authError || !user) {
    return errorResponse(401, "UNAUTHORIZED", "Authentication required")
  }

  try {
    const limit = toSafeLimit(request.nextUrl.searchParams.get("limit"))

    const { data: contradictionRows, error: contradictionError } = await supabaseClient
      .from("contradictions")
      .select("id, item1_id, item2_id, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (contradictionError) {
      throw contradictionError
    }

    const rows = (contradictionRows || []) as ContradictionRow[]
    if (rows.length === 0) {
      return NextResponse.json({ contradictions: [] as ContradictionInsight[] })
    }

    const entryIds = Array.from(
      new Set(rows.flatMap((row) => [row.item1_id, row.item2_id]))
    )

    const { data: entryRows, error: entryError } = await supabaseClient
      .from("knowledge_entries")
      .select("id, author, source_type, distilled")
      .eq("user_id", user.id)
      .in("id", entryIds)

    if (entryError) {
      throw entryError
    }

    const entryMap = new Map<string, EntryLiteRow>()
    for (const row of (entryRows || []) as EntryLiteRow[]) {
      entryMap.set(row.id, row)
    }

    const contradictions: ContradictionInsight[] = rows
      .map((row) => {
        const item1 = entryMap.get(row.item1_id)
        const item2 = entryMap.get(row.item2_id)
        if (!item1 || !item2) return null

        return {
          id: row.id,
          description: row.description,
          createdAt: row.created_at,
          item1: {
            id: item1.id,
            author: item1.author,
            sourceType: item1.source_type,
            coreIdea: getPrimaryCoreIdea(item1.distilled),
          },
          item2: {
            id: item2.id,
            author: item2.author,
            sourceType: item2.source_type,
            coreIdea: getPrimaryCoreIdea(item2.distilled),
          },
        }
      })
      .filter((item): item is ContradictionInsight => Boolean(item))

    return NextResponse.json({ contradictions })
  } catch (error) {
    console.error("Recent contradictions fetch error:", error)
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      error instanceof Error
        ? error.message
        : "Failed to fetch recent contradictions"
    )
  }
}
