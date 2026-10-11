import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { encryptSubstackSession } from "@/lib/substack-session"
import { substackIntegrationSchema } from "@/lib/validations"
import { errorResponse } from "@/lib/api/errors"
import { createRouteLogger } from "@/lib/api/server-log"

const PROFILE_URL = "https://substack.com/api/v1/user/profile/self"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse(401, "UNAUTHORIZED", "Authentication required")

  const { data, error } = await supabase
    .from("substack_integrations")
    .select("remote_handle, sync_likes, sync_saves, status, last_synced_at, last_error, created_at")
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) return errorResponse(500, "INTERNAL_ERROR", error.message)
  return NextResponse.json({ integration: data })
}

export async function POST(request: NextRequest) {
  const log = createRouteLogger("/api/integrations/substack")
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return errorResponse(401, "UNAUTHORIZED", "Authentication required")

  try {
    const body: unknown = await request.json()
    const parsed = substackIntegrationSchema.safeParse(body)
    if (!parsed.success) return errorResponse(400, "VALIDATION_FAILED", "Invalid integration settings", parsed.error.flatten())

    const response = await fetch(PROFILE_URL, {
      headers: {
        Accept: "application/json",
        Cookie: parsed.data.sessionCookie,
        "User-Agent": "Mozilla/5.0 (compatible; Noesis personal sync/1.0)",
      },
      signal: AbortSignal.timeout(15_000),
    })
    if (response.status === 401 || response.status === 403) {
      return errorResponse(400, "VALIDATION_FAILED", "Substack rejected that session. Copy a fresh Cookie header while signed in.")
    }
    if (!response.ok) return errorResponse(502, "UPSTREAM_ERROR", `Substack returned ${response.status}`)

    const profile = (await response.json()) as { id?: number | string; handle?: string }
    if (!profile.id) return errorResponse(502, "UPSTREAM_ERROR", "Substack did not return an account ID")

    const { error } = await supabase.from("substack_integrations").upsert({
      user_id: user.id,
      encrypted_session: encryptSubstackSession(parsed.data.sessionCookie),
      remote_user_id: String(profile.id),
      remote_handle: profile.handle ?? null,
      sync_likes: parsed.data.syncLikes,
      sync_saves: parsed.data.syncSaves,
      status: "active",
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    if (error) throw error

    log.info("integration.connected", { userId: user.id })
    return NextResponse.json({ ok: true, handle: profile.handle ?? null })
  } catch (error) {
    log.error("integration.connect_failed", error, { userId: user.id })
    return errorResponse(500, "INTERNAL_ERROR", error instanceof Error ? error.message : "Could not connect Substack")
  }
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse(401, "UNAUTHORIZED", "Authentication required")
  const { error } = await supabase.from("substack_integrations").delete().eq("user_id", user.id)
  if (error) return errorResponse(500, "INTERNAL_ERROR", error.message)
  return NextResponse.json({ ok: true })
}
