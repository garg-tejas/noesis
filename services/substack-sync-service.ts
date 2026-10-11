import type { SupabaseClient } from "@supabase/supabase-js"
import { distillContent } from "@/services/geminiService"
import { decryptSubstackSession } from "@/lib/substack-session"
import type { KnowledgeEntry } from "@/types"

const SUBSTACK_API = "https://substack.com/api/v1"
const MAX_EVENTS_PER_SYNC = 100
const MAX_ENTRIES_PROCESSED_PER_SYNC = 10

type IntegrationRow = {
  id: string
  user_id: string
  encrypted_session: string
  remote_user_id: string
  sync_likes: boolean
  sync_saves: boolean
}

type FeedItem = Record<string, unknown>

type Candidate = {
  interactionType: "like" | "save"
  remoteEventId: string
  postUrl: string
}

function substackHeaders(cookie: string): HeadersInit {
  return {
    Accept: "application/json",
    Cookie: cookie,
    "User-Agent": "Mozilla/5.0 (compatible; Noesis personal sync/1.0)",
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function stringValue(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key]
  return typeof value === "string" && value.trim() ? value : null
}

function postUrlFromRecord(item: FeedItem): string | null {
  const roots = [item, asRecord(item.context), asRecord(item.post), asRecord(asRecord(item.context)?.post)]
  for (const post of roots) {
    const canonicalUrl = stringValue(post, "canonical_url") || stringValue(post, "canonicalUrl")
    if (canonicalUrl) return canonicalUrl

    const slug = stringValue(post, "slug")
    const publication = asRecord(post?.publication) || asRecord(asRecord(item.context)?.publication)
    const hostname = stringValue(publication, "custom_domain") ||
      (stringValue(publication, "subdomain") ? `${stringValue(publication, "subdomain")}.substack.com` : null)
    if (slug && hostname) return `https://${hostname}/p/${slug}`
  }
  return null
}

function remoteEventId(item: FeedItem, fallback: string): string {
  const entityKey = stringValue(item, "entity_key")
  const id = stringValue(item, "id") ?? (typeof item.id === "number" ? String(item.id) : null)
  const timestamp = stringValue(asRecord(item.context), "created_at") || stringValue(item, "created_at")
  return entityKey || [id, timestamp, fallback].filter(Boolean).join(":")
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function fetchJson(url: string, cookie: string): Promise<unknown> {
  const response = await fetch(url, { headers: substackHeaders(cookie), signal: AbortSignal.timeout(15_000) })
  if (response.status === 401 || response.status === 403) {
    throw new Error("SUBSTACK_SESSION_EXPIRED")
  }
  if (!response.ok) throw new Error(`Substack returned ${response.status}`)
  return response.json()
}

async function collectLikes(integration: IntegrationRow, cookie: string): Promise<Candidate[]> {
  const params = new URLSearchParams({ limit: String(MAX_EVENTS_PER_SYNC) })
  params.append("types[]", "like")
  const payload = asRecord(await fetchJson(`${SUBSTACK_API}/reader/feed/profile/${integration.remote_user_id}?${params}`, cookie))
  const items = Array.isArray(payload?.items) ? payload.items.map(asRecord).filter((item): item is FeedItem => Boolean(item)) : []
  return items.flatMap((item) => {
    const postUrl = postUrlFromRecord(item)
    return postUrl ? [{ interactionType: "like" as const, remoteEventId: remoteEventId(item, postUrl), postUrl }] : []
  })
}

async function collectSaves(cookie: string): Promise<Candidate[]> {
  const params = new URLSearchParams({ inboxType: "inbox", surface: "inbox_saved", limit: String(MAX_EVENTS_PER_SYNC) })
  const payload = asRecord(await fetchJson(`${SUBSTACK_API}/inbox/top?${params}`, cookie))
  const posts = Array.isArray(payload?.posts) ? payload.posts.map(asRecord).filter((post): post is FeedItem => Boolean(post)) : []
  return posts.flatMap((post) => {
    const postUrl = postUrlFromRecord(post)
    return postUrl ? [{ interactionType: "save" as const, remoteEventId: remoteEventId(post, postUrl), postUrl }] : []
  })
}

async function fetchPublicPost(url: string): Promise<{ rawText: string; author: string; canonicalUrl: string }> {
  const parsed = new URL(url)
  const match = parsed.pathname.match(/^\/p\/([^/]+)/)
  if (!match) throw new Error("Substack post URL does not include a post slug")
  const response = await fetch(`${parsed.protocol}//${parsed.hostname}/api/v1/posts/${match[1]}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Noesis/1.0)" },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Could not fetch public post (${response.status})`)
  const post = (await response.json()) as Record<string, unknown>
  const body = typeof post.body_text === "string"
    ? post.body_text
    : typeof post.body_html === "string"
      ? htmlToText(post.body_html)
      : null
  if (!body) throw new Error("Post has no public text (it may be paywalled)")
  const author = stringValue(asRecord(post.author), "name") ?? "Unknown"
  const title = stringValue(post, "title")
  return {
    rawText: `${title ? `# ${title}\n\n` : ""}${body}`,
    author,
    canonicalUrl: stringValue(post, "canonical_url") ?? url,
  }
}

async function queueCandidates(admin: SupabaseClient, integration: IntegrationRow, candidates: Candidate[]) {
  if (!candidates.length) return
  const { error } = await admin.from("substack_sync_events").upsert(
    candidates.map((candidate) => ({
      user_id: integration.user_id,
      integration_id: integration.id,
      interaction_type: candidate.interactionType,
      remote_event_id: candidate.remoteEventId,
      post_url: candidate.postUrl,
    })),
    { onConflict: "integration_id,interaction_type,remote_event_id", ignoreDuplicates: true }
  )
  if (error) throw error
}

async function processQueuedEntries(admin: SupabaseClient, integration: IntegrationRow, onlyEventId?: string): Promise<number> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured")

  let query = admin
    .from("substack_sync_events")
    .select("id, post_url, attempt_count")
    .eq("integration_id", integration.id)
    .eq("status", "queued")
    .lte("available_at", new Date().toISOString())
    .order("available_at", { ascending: true })
  if (onlyEventId) query = query.eq("id", onlyEventId)
  const { data: events, error } = await query.limit(onlyEventId ? 1 : MAX_ENTRIES_PROCESSED_PER_SYNC)
  if (error) throw error

  let processed = 0
  for (const event of events || []) {
    try {
      const post = await fetchPublicPost(event.post_url)
      const { data: existing } = await admin
        .from("knowledge_entries")
        .select("id")
        .eq("user_id", integration.user_id)
        .eq("original_url", post.canonicalUrl)
        .maybeSingle()

      if (existing) {
        await admin.from("substack_sync_events").update({ status: "skipped", knowledge_entry_id: existing.id, processed_at: new Date().toISOString(), error: null }).eq("id", event.id)
        processed += 1
        continue
      }

      const distilled = await distillContent(post.rawText, "substack", apiKey)
      const { data: entry, error: insertError } = await admin.from("knowledge_entries").insert({
        user_id: integration.user_id,
        source_type: "substack",
        original_url: post.canonicalUrl,
        author: post.author,
        raw_text: post.rawText,
        distilled,
        is_favorite: false,
      }).select("id").single()
      if (insertError) throw insertError

      await admin.from("substack_sync_events").update({ status: "processed", knowledge_entry_id: entry.id, processed_at: new Date().toISOString(), error: null }).eq("id", event.id)
      processed += 1
    } catch (error) {
      const attemptCount = event.attempt_count + 1
      await admin.from("substack_sync_events").update({
        // Failed events stay in the database for explicit, user-triggered retries.
        // Scheduled syncs never retry them automatically.
        status: "failed",
        attempt_count: attemptCount,
        available_at: new Date().toISOString(),
        error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
        processed_at: new Date().toISOString(),
      }).eq("id", event.id)
    }
  }
  return processed
}

export async function retrySubstackEvent(admin: SupabaseClient, userId: string, eventId: string): Promise<number> {
  const { data: event, error: eventError } = await admin
    .from("substack_sync_events")
    .select("id, integration_id, status")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle()
  if (eventError) throw eventError
  if (!event || event.status !== "failed") throw new Error("Failed sync event not found")

  const { data: integration, error: integrationError } = await admin
    .from("substack_integrations")
    .select("id, user_id, encrypted_session, remote_user_id, sync_likes, sync_saves")
    .eq("id", event.integration_id)
    .eq("user_id", userId)
    .maybeSingle()
  if (integrationError) throw integrationError
  if (!integration) throw new Error("Substack integration not found")

  const { error: resetError } = await admin
    .from("substack_sync_events")
    .update({ status: "queued", error: null, processed_at: null, available_at: new Date().toISOString() })
    .eq("id", event.id)
  if (resetError) throw resetError

  return processQueuedEntries(admin, integration, event.id)
}

export async function syncSubstackIntegration(admin: SupabaseClient, integration: IntegrationRow) {
  const cookie = decryptSubstackSession(integration.encrypted_session)
  try {
    const candidates = [
      ...(integration.sync_likes ? await collectLikes(integration, cookie) : []),
      ...(integration.sync_saves ? await collectSaves(cookie) : []),
    ]
    await queueCandidates(admin, integration, candidates)
    const processed = await processQueuedEntries(admin, integration)
    await admin.from("substack_integrations").update({ status: "active", last_synced_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq("id", integration.id)
    return { discovered: candidates.length, processed }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync failure"
    await admin.from("substack_integrations").update({
      // An invalid session needs human action. Transient upstream errors should
      // stay active so the next scheduled run can recover automatically.
      status: message === "SUBSTACK_SESSION_EXPIRED" ? "reauth_required" : "active",
      last_error: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    }).eq("id", integration.id)
    throw error
  }
}
