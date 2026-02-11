import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { entriesSearchQuerySchema } from "@/lib/validations"
import { searchEntriesForUser } from "@/services/storageService"
import { errorResponse } from "@/lib/api/errors"
import { createRouteLogger } from "@/lib/api/server-log"

export async function GET(request: NextRequest) {
  const log = createRouteLogger("/api/entries")
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

    const parseResult = entriesSearchQuerySchema.safeParse({
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
      return errorResponse(
        400,
        "VALIDATION_FAILED",
        "Invalid query parameters",
        parseResult.error.flatten()
      )
    }

    const result = await searchEntriesForUser(
      parseResult.data,
      user.id,
      supabaseClient
    )

    log.info("request.succeeded", {
      userId: user.id,
      page: parseResult.data.page,
      limit: parseResult.data.limit,
      resultCount: result.data.length,
      total: result.pagination.total,
      durationMs: log.elapsedMs(),
    })
    return NextResponse.json(result)
  } catch (error) {
    log.error("request.failed", error, {
      userId: user?.id,
      durationMs: log.elapsedMs(),
    })
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to fetch entries"
    )
  }
}
