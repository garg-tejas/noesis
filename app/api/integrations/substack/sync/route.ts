import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { syncSubstackIntegration } from "@/services/substack-sync-service"
import { errorResponse } from "@/lib/api/errors"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse(401, "UNAUTHORIZED", "Authentication required")

  try {
    const admin = createAdminClient()
    const { data: integration, error } = await admin
      .from("substack_integrations")
      .select("id, user_id, encrypted_session, remote_user_id, sync_likes, sync_saves")
      .eq("user_id", user.id)
      .maybeSingle()
    if (error) throw error
    if (!integration) return errorResponse(404, "BAD_REQUEST", "No Substack integration is connected")

    const result = await syncSubstackIntegration(admin, integration)
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(502, "UPSTREAM_ERROR", error instanceof Error ? error.message : "Substack sync failed")
  }
}
