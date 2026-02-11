import { NextResponse } from "next/server"
import type { ApiErrorCode, ApiErrorResponse } from "@/types"

export const errorResponse = (
  status: number,
  code: ApiErrorCode,
  error: string,
  details?: unknown
) => {
  const payload: ApiErrorResponse = { error, code }
  if (details !== undefined) {
    payload.details = details
  }
  return NextResponse.json(payload, { status })
}

