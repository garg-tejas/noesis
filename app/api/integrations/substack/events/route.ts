import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { errorResponse } from "@/lib/api/errors"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse(401, "UNAUTHORIZED", "Authentication required")

  const { data, error } = await supabase
    .from("substack_sync_events")
    .select("id, interaction_type, post_url, error, attempt_count, discovered_at")
    .eq("user_id", user.id)
    .eq("status", "failed")
    .order("discovered_at", { ascending: false })
  if (error) return errorResponse(500, "INTERNAL_ERROR", error.message)
  return NextResponse.json({ events: data || [] })
}
