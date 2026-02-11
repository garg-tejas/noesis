import type { ApiErrorCode, ApiErrorResponse } from "@/types"

const VALID_API_ERROR_CODES: ApiErrorCode[] = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "RATE_LIMITED",
  "VALIDATION_FAILED",
  "BAD_REQUEST",
  "CONFIG_ERROR",
  "UPSTREAM_TIMEOUT",
  "UPSTREAM_ERROR",
  "INTERNAL_ERROR",
]

const isApiErrorCode = (value: unknown): value is ApiErrorCode =>
  typeof value === "string" && VALID_API_ERROR_CODES.includes(value as ApiErrorCode)

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { error?: unknown }).error === "string" &&
  isApiErrorCode((value as { code?: unknown }).code)

export class ApiClientError extends Error {
  status: number
  code: ApiErrorCode
  details?: unknown

  constructor({
    message,
    status,
    code,
    details,
  }: {
    message: string
    status: number
    code: ApiErrorCode
    details?: unknown
  }) {
    super(message)
    this.name = "ApiClientError"
    this.status = status
    this.code = code
    this.details = details
  }
}

export const toApiClientError = (
  response: Pick<Response, "status">,
  payload: unknown,
  fallbackMessage: string
): ApiClientError => {
  if (isApiErrorResponse(payload)) {
    return new ApiClientError({
      message: payload.error,
      status: response.status,
      code: payload.code,
      details: payload.details,
    })
  }

  return new ApiClientError({
    message: fallbackMessage,
    status: response.status,
    code: "INTERNAL_ERROR",
    details: payload,
  })
}

export const toUserFacingErrorMessage = (
  error: ApiClientError,
  fallbackMessage: string
): string => {
  switch (error.code) {
    case "UNAUTHORIZED":
      return "Your session has expired. Please sign in again."
    case "FORBIDDEN":
      return "You do not have permission to perform this action."
    case "RATE_LIMITED":
      return "Too many requests. Please wait a bit and try again."
    case "VALIDATION_FAILED":
      return "Some inputs are invalid. Please review and try again."
    case "BAD_REQUEST":
      return "The request is malformed. Please try again."
    case "CONFIG_ERROR":
      return "Service configuration is missing. Please try again later."
    case "UPSTREAM_TIMEOUT":
      return "AI processing timed out. Please try again."
    case "UPSTREAM_ERROR":
      return "AI service is temporarily unavailable. Please try again."
    case "INTERNAL_ERROR":
    default:
      return error.message || fallbackMessage
  }
}
