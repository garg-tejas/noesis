import type { KnowledgeEntry, Contradiction, SourceType } from "../types"
import { createClient } from "@/lib/supabase/client"
import { createClient as createServerClient } from "@/lib/supabase/server"

const mapDbRowToEntry = (row: {
  id: string
  source_type: KnowledgeEntry["sourceType"]
  original_url: string
  author: string
  raw_text: string | null
  distilled: KnowledgeEntry["distilled"]
  created_at: string
  is_favorite: boolean
  user_notes: string | null
}): KnowledgeEntry => ({
  id: row.id,
  sourceType: row.source_type,
  originalUrl: row.original_url,
  author: row.author,
  rawText: row.raw_text ?? undefined,
  distilled: row.distilled,
  createdAt: new Date(row.created_at).getTime(),
  isFavorite: row.is_favorite,
  userNotes: row.user_notes ?? undefined,
})

export const saveEntry = async (entry: KnowledgeEntry): Promise<void> => {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("User not authenticated")

  const { error } = await supabase.from("knowledge_entries").insert({
    id: entry.id,
    user_id: user.id,
    source_type: entry.sourceType,
    original_url: entry.originalUrl,
    author: entry.author,
    raw_text: entry.rawText,
    distilled: entry.distilled,
    created_at: new Date(entry.createdAt).toISOString(),
    is_favorite: entry.isFavorite,
    user_notes: entry.userNotes,
  })

  if (error) throw error
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface EntryQueryOptions extends PaginationOptions {
  searchQuery?: string
  minQualityScore?: number
  selectedTags?: string[]
  sourceFilter?: SourceType | "all"
  showLowQuality?: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

export interface EntrySearchResult extends PaginatedResult<KnowledgeEntry> {
  availableTags: string[]
}

const normalizeTag = (tag: string) => tag.trim().toLowerCase()

const matchesSearchQuery = (entry: KnowledgeEntry, searchQuery: string): boolean => {
  const q = searchQuery.toLowerCase()

  if (
    entry.distilled.context.toLowerCase().includes(q) ||
    entry.author.toLowerCase().includes(q) ||
    (entry.userNotes || "").toLowerCase().includes(q) ||
    (entry.rawText || "").toLowerCase().includes(q)
  ) {
    return true
  }

  for (const idea of entry.distilled.core_ideas) {
    if (idea.toLowerCase().includes(q)) return true
  }

  for (const actionable of entry.distilled.actionables) {
    if (actionable.toLowerCase().includes(q)) return true
  }

  for (const tag of entry.distilled.tags) {
    if (tag.toLowerCase().includes(q)) return true
  }

  return false
}

const applyEntryFilters = (
  entries: KnowledgeEntry[],
  options: EntryQueryOptions
): { filteredEntries: KnowledgeEntry[]; availableTags: string[] } => {
  const searchQuery = options.searchQuery?.trim() || ""
  const minQualityScore = options.minQualityScore ?? 0
  const showLowQuality = options.showLowQuality ?? false
  const sourceFilter = options.sourceFilter ?? "all"
  const selectedTagKeys = Array.from(
    new Set((options.selectedTags || []).map(normalizeTag).filter(Boolean))
  )

  const effectiveMinQualityScore = Math.max(
    minQualityScore,
    showLowQuality ? 0 : 40
  )

  const baseEntries = entries.filter((entry) => {
    if (entry.distilled.quality_score < effectiveMinQualityScore) return false
    if (sourceFilter !== "all" && entry.sourceType !== sourceFilter) return false
    if (searchQuery && !matchesSearchQuery(entry, searchQuery)) return false
    return true
  })

  const availableTagMap = new Map<string, string>()
  baseEntries.forEach((entry) => {
    entry.distilled.tags.forEach((tag) => {
      const key = normalizeTag(tag)
      if (key && !availableTagMap.has(key)) {
        availableTagMap.set(key, tag)
      }
    })
  })
  const availableTags = Array.from(availableTagMap.values()).sort((a, b) =>
    a.localeCompare(b)
  )

  if (selectedTagKeys.length === 0) {
    return { filteredEntries: baseEntries, availableTags }
  }

  const selectedTagSet = new Set(selectedTagKeys)
  const filteredEntries = baseEntries.filter((entry) =>
    entry.distilled.tags.some((tag) => selectedTagSet.has(normalizeTag(tag)))
  )

  return { filteredEntries, availableTags }
}

const paginateEntries = (
  entries: KnowledgeEntry[],
  page: number,
  limit: number,
  availableTags: string[]
): EntrySearchResult => {
  const total = entries.length
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages)
  const offset = (safePage - 1) * limit
  const data = entries.slice(offset, offset + limit)

  return {
    data,
    availableTags,
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasMore: safePage < totalPages,
    },
  }
}

export const searchEntriesForUser = async (
  options: EntryQueryOptions,
  userId: string,
  supabaseClient: Awaited<ReturnType<typeof createServerClient>>
): Promise<EntrySearchResult> => {
  const page = options.page ?? 1
  const limit = options.limit ?? 20

  const { data, error } = await supabaseClient
    .from("knowledge_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error

  const allEntries = (data || []).map(mapDbRowToEntry)
  const { filteredEntries, availableTags } = applyEntryFilters(allEntries, options)

  return paginateEntries(filteredEntries, page, limit, availableTags)
}

export const getEntries = async (
  options: EntryQueryOptions = {}
): Promise<EntrySearchResult> => {
  const {
    page = 1,
    limit = 20,
    searchQuery = "",
    minQualityScore = 0,
    selectedTags = [],
    sourceFilter = "all",
    showLowQuality = false,
  } = options

  const params = new URLSearchParams()
  params.set("page", page.toString())
  params.set("limit", limit.toString())
  params.set("searchQuery", searchQuery)
  params.set("minQualityScore", minQualityScore.toString())
  params.set("sourceFilter", sourceFilter)
  params.set("showLowQuality", showLowQuality ? "true" : "false")
  selectedTags.forEach((tag) => {
    const trimmed = tag.trim()
    if (trimmed) params.append("tag", trimmed)
  })

  const response = await fetch(`/api/entries?${params.toString()}`)
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || "Failed to fetch entries")
  }

  return payload as EntrySearchResult
}

/**
 * Helper function to get all entries without pagination
 * Useful for operations that need all entries (like contradiction detection)
 */
export const getAllEntries = async (): Promise<KnowledgeEntry[]> => {
  const allEntries: KnowledgeEntry[] = []
  let page = 1
  const limit = 200

  while (true) {
    const result = await getEntries({
      page,
      limit,
      searchQuery: "",
      minQualityScore: 0,
      selectedTags: [],
      sourceFilter: "all",
      showLowQuality: true,
    })

    allEntries.push(...result.data)
    if (!result.pagination.hasMore) break

    page += 1
    if (page > 100) {
      console.warn("getAllEntries reached pagination safety limit")
      break
    }
  }

  return allEntries
}

export const getEntriesByIdsForUser = async (
  entryIds: string[],
  userId: string,
  supabaseClient: Awaited<ReturnType<typeof createServerClient>>
): Promise<KnowledgeEntry[]> => {
  if (entryIds.length === 0) return []

  const uniqueEntryIds = Array.from(new Set(entryIds))
  const { data, error } = await supabaseClient
    .from("knowledge_entries")
    .select("*")
    .eq("user_id", userId)
    .in("id", uniqueEntryIds)

  if (error) throw error
  return (data || []).map(mapDbRowToEntry)
}

export const deleteEntry = async (id: string): Promise<void> => {
  const supabase = createClient()
  const { error } = await supabase.from("knowledge_entries").delete().eq("id", id)

  if (error) throw error
}

export const updateEntry = async (id: string, updates: Partial<KnowledgeEntry>): Promise<void> => {
  const supabase = createClient()

  const dbUpdates: Record<string, unknown> = {}
  if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite
  if (updates.userNotes !== undefined) dbUpdates.user_notes = updates.userNotes

  const { error } = await supabase.from("knowledge_entries").update(dbUpdates).eq("id", id)

  if (error) throw error
}

export const toggleFavorite = async (id: string): Promise<void> => {
  const supabase = createClient()

  const { data: entry } = await supabase.from("knowledge_entries").select("is_favorite").eq("id", id).single()

  if (!entry) throw new Error("Entry not found")

  const { error } = await supabase.from("knowledge_entries").update({ is_favorite: !entry.is_favorite }).eq("id", id)

  if (error) throw error
}

/**
 * Appends a contradiction note to an entry's user notes.
 * Avoids duplicates by checking if the contradiction is already mentioned.
 * Server-side only (used in API routes).
 */
export const appendContradictionNote = async (
  entryId: string,
  otherEntryId: string,
  contradictionDescription: string,
  otherEntryAuthor: string,
  supabaseClient: Awaited<ReturnType<typeof createServerClient>>
): Promise<void> => {
  const { data: entry, error: fetchError } = await supabaseClient
    .from("knowledge_entries")
    .select("user_notes")
    .eq("id", entryId)
    .single()

  if (fetchError) throw fetchError
  if (!entry) throw new Error("Entry not found")

  const existingNotes = entry.user_notes || ""
  const contradictionMarker = `🔴 CONTRADICTION`
  
  if (existingNotes.includes(contradictionMarker) && existingNotes.includes(otherEntryId)) {
    console.log(`Contradiction note already exists for entry ${entryId}`)
    return
  }

  const timestamp = new Date().toLocaleDateString()
  const contradictionNote = `\n\n${contradictionMarker} (${timestamp})\nContradicts: ${otherEntryAuthor}\n${contradictionDescription}\n---`

  const updatedNotes = existingNotes.trim() 
    ? `${existingNotes}${contradictionNote}`
    : contradictionNote.trim()

  const { error: updateError } = await supabaseClient
    .from("knowledge_entries")
    .update({ user_notes: updatedNotes })
    .eq("id", entryId)

  if (updateError) throw updateError
}
