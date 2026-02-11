import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { entriesSearchQuerySchema } from "@/lib/validations"
import { searchEntriesForUser } from "@/services/storageService"
import { errorResponse } from "@/lib/api/errors"

export async function GET(request: NextRequest) {
  const supabaseClient = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser()

  if (authError || !user) {
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

    return NextResponse.json(result)
  } catch (error) {
    console.error("Entries search error:", error)
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to fetch entries"
    )
  }
}

