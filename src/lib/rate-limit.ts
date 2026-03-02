/**
 * In-memory rate limiter (no Redis dependency)
 */
import { NextResponse } from 'next/server'

export const RATE_LIMITS = {
  API: { limit: 10, windowMs: 10_000 },
  READ: { limit: 30, windowMs: 10_000 },
  LOGIN: { limit: 5, windowMs: 15 * 60_000 },
  CREATE_ISSUE: { limit: 5, windowMs: 60_000 },
  CREATE_COMMENT: { limit: 3, windowMs: 10_000 },
  UPLOAD: { windowMs: 60_000, maxBytes: 500 * 1024 * 1024, maxFiles: 20 },
} as const

interface RateLimitEntry {
  count: number
  resetAt: number
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(config: { limit: number; windowMs: number }) {
    this.maxRequests = config.limit
    this.windowMs = config.windowMs
  }

  async limit(identifier: string): Promise<{ success: boolean; reset: number }> {
    const now = Date.now()
    const entry = this.store.get(identifier)

    // Clean expired entry
    if (entry && now >= entry.resetAt) {
      this.store.delete(identifier)
    }

    const current = this.store.get(identifier)

    if (!current) {
      this.store.set(identifier, {
        count: 1,
        resetAt: now + this.windowMs,
      })
      return { success: true, reset: now + this.windowMs }
    }

    if (current.count >= this.maxRequests) {
      return { success: false, reset: current.resetAt }
    }

    current.count++
    return { success: true, reset: current.resetAt }
  }
}

export function createRateLimitErrorResponse(reset: number) {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000)
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    }
  )
}

// Pre-configured rate limiters
export const apiRateLimiter = new RateLimiter(RATE_LIMITS.API)
export const readRateLimiter = new RateLimiter(RATE_LIMITS.READ)
export const loginRateLimiter = new RateLimiter(RATE_LIMITS.LOGIN)
export const createIssueRateLimiter = new RateLimiter(RATE_LIMITS.CREATE_ISSUE)
export const createCommentRateLimiter = new RateLimiter(RATE_LIMITS.CREATE_COMMENT)
