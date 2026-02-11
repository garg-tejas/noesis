import { NextRequest, NextResponse } from "next/server"
import { AIServiceError, distillContent } from "@/services/geminiService"
import { distillRequestSchema } from "@/lib/validations"
import { createClient } from "@/lib/supabase/server"
import { errorResponse } from "@/lib/api/errors"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return errorResponse(401, "UNAUTHORIZED", "Authentication required")
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return errorResponse(500, "CONFIG_ERROR", "GEMINI_API_KEY is not configured")
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, "BAD_REQUEST", "Malformed JSON body")
    }

    const parseResult = distillRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return errorResponse(400, "VALIDATION_FAILED", "Validation failed", parseResult.error.flatten())
    }

    const { rawText, sourceType, youtubeUrl } = parseResult.data

    const distilledData = await distillContent(
      rawText,
      sourceType,
      apiKey,
      youtubeUrl
    )

    return NextResponse.json(distilledData)
  } catch (error) {
    console.error("Distillation error:", error)
    if (error instanceof AIServiceError) {
      if (error.code === "UPSTREAM_TIMEOUT") {
        return errorResponse(504, "UPSTREAM_TIMEOUT", "AI processing timed out. Please try again.")
      }
      return errorResponse(503, "UPSTREAM_ERROR", "AI service is temporarily unavailable. Please try again.")
    }
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to distill content"
    )
  }
}

