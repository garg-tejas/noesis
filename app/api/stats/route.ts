import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { errorResponse } from "@/lib/api/errors"
import { createRouteLogger } from "@/lib/api/server-log"
import { computeDashboardStats } from "@/lib/server/dashboard-queries"

export async function GET() {
  const log = createRouteLogger("/api/stats")
  log.info("request.received")

  const supabaseClient = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser()

  if (authError || !user) {
    log.warn("auth.failed", { durationMs: log.elapsedMs() })
    return errorResponse(401, "UNAUTHORIZED", "Authentication required")
  }

  try {
    const response = await computeDashboardStats(supabaseClient, user.id)

    log.info("request.succeeded", {
      userId: user.id,
      totalEntries: response.totalEntries,
      contradictionCount: response.contradictionCount,
      durationMs: log.elapsedMs(),
    })
    return NextResponse.json(response)
  } catch (error) {
    log.error("request.failed", error, {
      userId: user.id,
      durationMs: log.elapsedMs(),
    })
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to fetch dashboard stats"
    )
  }
}
