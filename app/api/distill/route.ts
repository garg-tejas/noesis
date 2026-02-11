import { NextRequest, NextResponse } from "next/server"
import { AIServiceError, distillContent } from "@/services/geminiService"
import { distillRequestSchema } from "@/lib/validations"
import { createClient } from "@/lib/supabase/server"
import { errorResponse } from "@/lib/api/errors"
import { consumeRateLimit, getClientIp } from "@/lib/api/rate-limit"
import { createRouteLogger } from "@/lib/api/server-log"

const DISTILL_RATE_LIMIT_MAX_REQUESTS = Number.parseInt(
  process.env.DISTILL_RATE_LIMIT_MAX_REQUESTS || "12",
  10
)
const DISTILL_RATE_LIMIT_WINDOW_MS = Number.parseInt(
  process.env.DISTILL_RATE_LIMIT_WINDOW_MS || "60000",
  10
)

export async function POST(request: NextRequest) {
  const log = createRouteLogger("/api/distill")
  log.info("request.received")

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    log.warn("auth.failed", { durationMs: log.elapsedMs() })
    return errorResponse(401, "UNAUTHORIZED", "Authentication required")
  }

  const rateLimitResult = consumeRateLimit({
    namespace: "api:distill",
    key: `${user.id}:${getClientIp(request)}`,
    limit: DISTILL_RATE_LIMIT_MAX_REQUESTS,
    windowMs: DISTILL_RATE_LIMIT_WINDOW_MS,
  })
  if (!rateLimitResult.allowed) {
    log.warn("rate_limit.blocked", {
      userId: user.id,
      retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      durationMs: log.elapsedMs(),
    })
    return errorResponse(
      429,
      "RATE_LIMITED",
      "Too many distillation requests. Please wait before retrying.",
      {
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
        limit: rateLimitResult.limit,
        windowMs: rateLimitResult.windowMs,
      },
      { "Retry-After": rateLimitResult.retryAfterSeconds.toString() }
    )
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      log.error("config.missing_gemini_api_key", "GEMINI_API_KEY is not configured", {
        userId: user.id,
        durationMs: log.elapsedMs(),
      })
      return errorResponse(500, "CONFIG_ERROR", "GEMINI_API_KEY is not configured")
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      log.warn("request.bad_json", {
        userId: user.id,
        durationMs: log.elapsedMs(),
      })
      return errorResponse(400, "BAD_REQUEST", "Malformed JSON body")
    }

    const parseResult = distillRequestSchema.safeParse(body)
    if (!parseResult.success) {
      log.warn("request.validation_failed", {
        userId: user.id,
        durationMs: log.elapsedMs(),
      })
      return errorResponse(400, "VALIDATION_FAILED", "Validation failed", parseResult.error.flatten())
    }

    const { rawText, sourceType, youtubeUrl } = parseResult.data

    const distilledData = await distillContent(
      rawText,
      sourceType,
      apiKey,
      youtubeUrl
    )

    log.info("request.succeeded", {
      userId: user.id,
      sourceType,
      durationMs: log.elapsedMs(),
    })
    return NextResponse.json(distilledData)
  } catch (error) {
    log.error("request.failed", error, {
      userId: user.id,
      durationMs: log.elapsedMs(),
    })
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

