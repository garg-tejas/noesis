import type { NextRequest } from "next/server"

interface RateLimitBucket {
  count: number
  resetAt: number
}

interface RateLimitStoreContainer {
  store: Map<string, RateLimitBucket>
}

const GLOBAL_RATE_LIMIT_STORE_KEY = "__noesis_rate_limit_store__"

const getRateLimitStore = (): Map<string, RateLimitBucket> => {
  const globalScope = globalThis as typeof globalThis & {
    [GLOBAL_RATE_LIMIT_STORE_KEY]?: RateLimitStoreContainer
  }

  if (!globalScope[GLOBAL_RATE_LIMIT_STORE_KEY]) {
    globalScope[GLOBAL_RATE_LIMIT_STORE_KEY] = { store: new Map() }
  }

  return globalScope[GLOBAL_RATE_LIMIT_STORE_KEY]!.store
}

const pruneExpiredBuckets = (
  store: Map<string, RateLimitBucket>,
  now: number
) => {
  if (store.size < 1000) return

  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key)
    }
  }
}

export interface ConsumeRateLimitInput {
  namespace: string
  key: string
  limit: number
  windowMs: number
}

export interface ConsumeRateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
  resetAt: number
  windowMs: number
}

export const consumeRateLimit = (
  input: ConsumeRateLimitInput
): ConsumeRateLimitResult => {
  const limit = Math.max(1, Math.floor(input.limit))
  const windowMs = Math.max(1000, Math.floor(input.windowMs))

  const now = Date.now()
  const store = getRateLimitStore()
  pruneExpiredBuckets(store, now)

  const bucketKey = `${input.namespace}:${input.key}`
  const existing = store.get(bucketKey)
  const bucket =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : existing

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((bucket.resetAt - now) / 1000)
    )

    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds,
      resetAt: bucket.resetAt,
      windowMs,
    }
  }

  bucket.count += 1
  store.set(bucketKey, bucket)

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    resetAt: bucket.resetAt,
    windowMs,
  }
}

export const getClientIp = (request: NextRequest): string => {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0]?.trim()
    if (ip) return ip
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp

  const cloudflareIp = request.headers.get("cf-connecting-ip")
  if (cloudflareIp) return cloudflareIp

  return "unknown"
}

