import type { KnowledgeEntry, Contradiction } from "../types"
import { createClient } from "@/lib/supabase/client"

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

export const getEntries = async (): Promise<KnowledgeEntry[]> => {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from("knowledge_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data || []).map((row) => ({
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

  // Get current favorite status
  const { data: entry } = await supabase.from("knowledge_entries").select("is_favorite").eq("id", id).single()

  if (!entry) throw new Error("Entry not found")

  const { error } = await supabase.from("knowledge_entries").update({ is_favorite: !entry.is_favorite }).eq("id", id)

  if (error) throw error
}

/**
 * Appends a contradiction note to an entry's user notes
 * Avoids duplicates by checking if the contradiction is already mentioned
 * This function works server-side (used in API routes)
 */
export const appendContradictionNote = async (
  entryId: string,
  otherEntryId: string,
  contradictionDescription: string,
  otherEntryAuthor: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> => {
  // Get current entry to check existing notes
  const { data: entry, error: fetchError } = await supabaseClient
    .from("knowledge_entries")
    .select("user_notes")
    .eq("id", entryId)
    .single()

  if (fetchError) throw fetchError
  if (!entry) throw new Error("Entry not found")

  const existingNotes = entry.user_notes || ""
  const contradictionMarker = `🔴 CONTRADICTION`
  
  // Check if this contradiction is already noted (avoid duplicates)
  if (existingNotes.includes(contradictionMarker) && existingNotes.includes(otherEntryId)) {
    console.log(`Contradiction note already exists for entry ${entryId}`)
    return
  }

  // Format the contradiction note
  const timestamp = new Date().toLocaleDateString()
  const contradictionNote = `\n\n${contradictionMarker} (${timestamp})\nContradicts: ${otherEntryAuthor}\n${contradictionDescription}\n---`

  // Append to existing notes
  const updatedNotes = existingNotes.trim() 
    ? `${existingNotes}${contradictionNote}`
    : contradictionNote.trim()

  const { error: updateError } = await supabaseClient
    .from("knowledge_entries")
    .update({ user_notes: updatedNotes })
    .eq("id", entryId)

  if (updateError) throw updateError
}
