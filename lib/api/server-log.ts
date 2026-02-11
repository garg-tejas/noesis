type LogLevel = "info" | "warn" | "error"

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  info: 1,
  warn: 2,
  error: 3,
}

const SERVER_LOG_LEVEL = (
  process.env.SERVER_LOG_LEVEL?.toLowerCase() || "info"
) as LogLevel

const shouldLog = (level: LogLevel): boolean =>
  LOG_LEVEL_ORDER[level] >= (LOG_LEVEL_ORDER[SERVER_LOG_LEVEL] || LOG_LEVEL_ORDER.info)

const toErrorMessage = (value: unknown): string => {
  if (value instanceof Error) return value.message
  return String(value)
}

const makeRequestId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const createRouteLogger = (route: string) => {
  const startedAt = Date.now()
  const requestId = makeRequestId()
  const base = { route, requestId }

  const write = (level: LogLevel, event: string, data?: Record<string, unknown>) => {
    if (!shouldLog(level)) return
    const payload = {
      ...base,
      event,
      timestamp: new Date().toISOString(),
      ...(data || {}),
    }
    if (level === "info") {
      console.info("[api]", payload)
      return
    }
    if (level === "warn") {
      console.warn("[api]", payload)
      return
    }
    console.error("[api]", payload)
  }

  return {
    requestId,
    elapsedMs: () => Date.now() - startedAt,
    info: (event: string, data?: Record<string, unknown>) => write("info", event, data),
    warn: (event: string, data?: Record<string, unknown>) => write("warn", event, data),
    error: (event: string, error: unknown, data?: Record<string, unknown>) =>
      write("error", event, {
        error: toErrorMessage(error),
        ...(data || {}),
      }),
  }
}
