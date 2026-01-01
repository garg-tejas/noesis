import { NextRequest, NextResponse } from "next/server"
import { distillContent } from "@/services/geminiService"
import { distillRequestSchema } from "@/lib/validations"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      )
    }

    const body = await request.json()

    // Validate request body with Zod
    const parseResult = distillRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      )
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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to distill content",
      },
      { status: 500 }
    )
  }
}

