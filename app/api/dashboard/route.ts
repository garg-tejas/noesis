import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { dashboardBootstrapQuerySchema } from "@/lib/validations"
import { searchEntriesForUser } from "@/services/storageService"
import { computeDashboardStats } from "@/lib/server/dashboard-queries"
import { errorResponse } from "@/lib/api/errors"
import { createRouteLogger } from "@/lib/api/server-log"

export async function GET(request: NextRequest) {
  const log = createRouteLogger("/api/dashboard")
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

  const searchParams = request.nextUrl.searchParams
  const rawShowLowQuality = searchParams.get("showLowQuality")
  const showLowQuality =
    rawShowLowQuality === null
      ? undefined
      : rawShowLowQuality === "true"
        ? true
        : rawShowLowQuality === "false"
          ? false
          : rawShowLowQuality

  const selectedTags = searchParams
    .getAll("tag")
    .flatMap((tag) => tag.split(","))
    .map((tag) => tag.trim())
    .filter(Boolean)

  const parseResult = dashboardBootstrapQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    searchQuery: searchParams.get("searchQuery") ?? undefined,
    minQualityScore: searchParams.get("minQualityScore") ?? undefined,
    sourceFilter: searchParams.get("sourceFilter") ?? undefined,
    showLowQuality,
    selectedTags: selectedTags.length > 0 ? selectedTags : undefined,
  })

  if (!parseResult.success) {
    log.warn("request.validation_failed", {
      userId: user.id,
      durationMs: log.elapsedMs(),
    })
    return errorResponse(400, "VALIDATION_FAILED", "Invalid query parameters", parseResult.error.flatten())
  }

  const entryQuery = parseResult.data

  try {
    const [entries, stats] = await Promise.all([
      searchEntriesForUser(entryQuery, user.id, supabaseClient),
      computeDashboardStats(supabaseClient, user.id),
    ])

    log.info("request.succeeded", {
      userId: user.id,
      page: entryQuery.page,
      limit: entryQuery.limit,
      durationMs: log.elapsedMs(),
    })

    return NextResponse.json({
      entries,
      stats,
    })
  } catch (error) {
    log.error("request.failed", error, {
      userId: user.id,
      durationMs: log.elapsedMs(),
    })
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to load dashboard"
    )
  }
}
