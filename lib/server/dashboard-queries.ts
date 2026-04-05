import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  ContradictionInsight,
  DashboardStats,
  KnowledgeEntry,
  SourceBreakdown,
  SourceType,
  TagCount,
} from "@/types"

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

export async function computeDashboardStats(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardStats> {
  const [entriesResult, contradictionsResult] = await Promise.all([
    supabase
      .from("knowledge_entries")
      .select("source_type, is_favorite, distilled")
      .eq("user_id", userId),
    supabase
      .from("contradictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ])

  if (entriesResult.error) throw entriesResult.error
  if (contradictionsResult.error) throw contradictionsResult.error

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
      typeof distilled?.quality_score === "number" ? distilled.quality_score : Number.NaN
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
    qualityScoreCount > 0 ? Math.round((qualityScoreTotal / qualityScoreCount) * 10) / 10 : 0

  const topTags: TagCount[] = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.tag.localeCompare(b.tag)
    })
    .slice(0, 8)

  return {
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
}

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

const getPrimaryCoreIdea = (distilled: EntryLiteRow["distilled"]): string => {
  const ideas = distilled?.core_ideas
  if (!Array.isArray(ideas)) return "No core idea available"
  const firstIdea = ideas.find((idea) => typeof idea === "string" && idea.trim().length > 0)
  return typeof firstIdea === "string" ? firstIdea.trim() : "No core idea available"
}

export async function fetchRecentContradictionsInsights(
  supabase: SupabaseClient,
  userId: string,
  limit: number
): Promise<ContradictionInsight[]> {
  const { data: contradictionRows, error: contradictionError } = await supabase
    .from("contradictions")
    .select("id, item1_id, item2_id, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (contradictionError) throw contradictionError

  const rows = (contradictionRows || []) as ContradictionRow[]
  if (rows.length === 0) return []

  const entryIds = Array.from(new Set(rows.flatMap((row) => [row.item1_id, row.item2_id])))

  const { data: entryRows, error: entryError } = await supabase
    .from("knowledge_entries")
    .select("id, author, source_type, distilled")
    .eq("user_id", userId)
    .in("id", entryIds)

  if (entryError) throw entryError

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

  return contradictions
}
