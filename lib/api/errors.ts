import { NextResponse } from "next/server"
import type { ApiErrorCode, ApiErrorResponse } from "@/types"

export const errorResponse = (
  status: number,
  code: ApiErrorCode,
  error: string,
  details?: unknown,
  headers?: Record<string, string>
) => {
  const payload: ApiErrorResponse = { error, code }
  if (details !== undefined) {
    payload.details = details
  }
  const response = NextResponse.json(payload, { status })
  if (headers) {
    for (const [name, value] of Object.entries(headers)) {
      response.headers.set(name, value)
    }
  }
  return response
}
