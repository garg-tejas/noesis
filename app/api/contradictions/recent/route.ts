import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { errorResponse } from "@/lib/api/errors"
import { createRouteLogger } from "@/lib/api/server-log"
import { fetchRecentContradictionsInsights } from "@/lib/server/dashboard-queries"

const toSafeLimit = (value: string | null): number => {
  if (!value) return 6
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 6
  return Math.min(Math.max(parsed, 1), 20)
}

export async function GET(request: NextRequest) {
  const log = createRouteLogger("/api/contradictions/recent")
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
    const limit = toSafeLimit(request.nextUrl.searchParams.get("limit"))

    const contradictions = await fetchRecentContradictionsInsights(supabaseClient, user.id, limit)

    log.info("request.succeeded", {
      userId: user.id,
      limit,
      contradictions: contradictions.length,
      durationMs: log.elapsedMs(),
    })
    return NextResponse.json({ contradictions })
  } catch (error) {
    log.error("request.failed", error, {
      userId: user.id,
      durationMs: log.elapsedMs(),
    })
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to fetch recent contradictions"
    )
  }
}
