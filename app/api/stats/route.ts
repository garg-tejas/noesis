import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { errorResponse } from "@/lib/api/errors"
import type { DashboardStats, SourceType, SourceBreakdown, TagCount } from "@/types"

type EntryStatsRow = {
  source_type: SourceType
  is_favorite: boolean
  distilled: {
    quality_score?: unknown
    tags?: unknown
  } | null
}

const createSourceBreakdown = (): SourceBreakdown => ({
  twitter: 0,
  blog: 0,
  youtube: 0,
  other: 0,
})

export async function GET() {
  const supabaseClient = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser()

  if (authError || !user) {
    return errorResponse(401, "UNAUTHORIZED", "Authentication required")
  }

  try {
    const [entriesResult, contradictionsResult] = await Promise.all([
      supabaseClient
        .from("knowledge_entries")
        .select("source_type, is_favorite, distilled")
        .eq("user_id", user.id),
      supabaseClient
        .from("contradictions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ])

    if (entriesResult.error) {
      throw entriesResult.error
    }
    if (contradictionsResult.error) {
      throw contradictionsResult.error
    }

    const rows = (entriesResult.data || []) as EntryStatsRow[]
    const sourceBreakdown = createSourceBreakdown()
    const tagCounts = new Map<string, number>()

    let favoriteEntries = 0
    let qualityScoreTotal = 0
    let qualityScoreCount = 0
    let highQualityCount = 0
    let mediumQualityCount = 0
    let lowQualityCount = 0

    for (const row of rows) {
      if (row.source_type in sourceBreakdown) {
        sourceBreakdown[row.source_type] += 1
      } else {
        sourceBreakdown.other += 1
      }

      if (row.is_favorite) {
        favoriteEntries += 1
      }

      const distilled = row.distilled
      const qualityScore =
        typeof distilled?.quality_score === "number"
          ? distilled.quality_score
          : Number.NaN
      if (Number.isFinite(qualityScore)) {
        qualityScoreTotal += qualityScore
        qualityScoreCount += 1

        if (qualityScore >= 80) {
          highQualityCount += 1
        } else if (qualityScore >= 60) {
          mediumQualityCount += 1
        } else {
          lowQualityCount += 1
        }
      }

      if (Array.isArray(distilled?.tags)) {
        for (const rawTag of distilled.tags) {
          if (typeof rawTag !== "string") continue
          const normalizedTag = rawTag.trim()
          if (!normalizedTag) continue
          tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1)
        }
      }
    }

    const averageQualityScore =
      qualityScoreCount > 0
        ? Math.round((qualityScoreTotal / qualityScoreCount) * 10) / 10
        : 0

    const topTags: TagCount[] = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return a.tag.localeCompare(b.tag)
      })
      .slice(0, 8)

    const response: DashboardStats = {
      totalEntries: rows.length,
      favoriteEntries,
      contradictionCount: contradictionsResult.count ?? 0,
      averageQualityScore,
      sourceBreakdown,
      topTags,
      qualityBands: {
        high: highQualityCount,
        medium: mediumQualityCount,
        low: lowQualityCount,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Stats fetch error:", error)
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to fetch dashboard stats"
    )
  }
}
