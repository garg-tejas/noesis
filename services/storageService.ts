import type { KnowledgeEntry, Contradiction } from "../types"
import { createClient } from "@/lib/supabase/client"
import { createClient as createServerClient } from "@/lib/supabase/server"

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

export const getEntries = async (
  options: PaginationOptions = {}
): Promise<PaginatedResult<KnowledgeEntry>> => {
  const { page = 1, limit = 20 } = options
  const offset = (page - 1) * limit

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0, hasMore: false },
    }
  }

  const { count } = await supabase
    .from("knowledge_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  const total = count ?? 0
  const totalPages = Math.ceil(total / limit)

  const { data, error } = await supabase
    .from("knowledge_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  const entries = (data || []).map((row) => ({
    id: row.id,
    sourceType: row.source_type,
    originalUrl: row.original_url,
    author: row.author,
    rawText: row.raw_text,
    distilled: row.distilled,
    createdAt: new Date(row.created_at).getTime(),
    isFavorite: row.is_favorite,
    userNotes: row.user_notes,
  }))

  return {
    data: entries,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  }
}

/**
 * Helper function to get all entries without pagination
 * Useful for operations that need all entries (like contradiction detection)
 */
export const getAllEntries = async (): Promise<KnowledgeEntry[]> => {
  const result = await getEntries({ page: 1, limit: 1000 })
  return result.data
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
