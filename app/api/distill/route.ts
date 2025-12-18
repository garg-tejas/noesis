import { NextRequest, NextResponse } from "next/server"
import { distillContent } from "@/services/geminiService"
import type { SourceType } from "@/types"

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
    const { rawText, sourceType } = body

    if (!rawText || !sourceType) {
      return NextResponse.json(
        { error: "Missing required fields: rawText and sourceType" },
        { status: 400 }
      )
    }

    const distilledData = await distillContent(
      rawText,
      sourceType as SourceType,
      apiKey
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

