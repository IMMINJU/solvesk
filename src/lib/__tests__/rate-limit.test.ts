import { describe, it, expect, beforeEach } from 'vitest'
import { RateLimiter, RATE_LIMITS } from '../rate-limit'

describe('RateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter({ limit: 3, windowMs: 10_000 })
  })

  it('allows requests under the limit', async () => {
    const r1 = await limiter.limit('user:1')
    const r2 = await limiter.limit('user:1')
    const r3 = await limiter.limit('user:1')
    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
    expect(r3.success).toBe(true)
  })

  it('blocks requests over the limit', async () => {
    await limiter.limit('user:1')
    await limiter.limit('user:1')
    await limiter.limit('user:1')
    const r4 = await limiter.limit('user:1')
    expect(r4.success).toBe(false)
  })

  it('tracks users independently', async () => {
    await limiter.limit('user:1')
    await limiter.limit('user:1')
    await limiter.limit('user:1')
    const blocked = await limiter.limit('user:1')
    const allowed = await limiter.limit('user:2')
    expect(blocked.success).toBe(false)
    expect(allowed.success).toBe(true)
  })

  it('returns reset timestamp in the future', async () => {
    const before = Date.now()
    const result = await limiter.limit('user:1')
    expect(result.reset).toBeGreaterThan(before)
    expect(result.reset).toBeLessThanOrEqual(before + 10_000 + 50) // small tolerance
  })

  it('resets after window expires', async () => {
    // Use a tiny window
    const fastLimiter = new RateLimiter({ limit: 1, windowMs: 1 })
    await fastLimiter.limit('user:1')

    // Wait for window to expire
    await new Promise(r => setTimeout(r, 5))

    const result = await fastLimiter.limit('user:1')
    expect(result.success).toBe(true)
  })
})

describe('RATE_LIMITS constants', () => {
  it('has expected keys', () => {
    expect(RATE_LIMITS).toHaveProperty('API')
    expect(RATE_LIMITS).toHaveProperty('READ')
    expect(RATE_LIMITS).toHaveProperty('LOGIN')
    expect(RATE_LIMITS).toHaveProperty('CREATE_ISSUE')
    expect(RATE_LIMITS).toHaveProperty('CREATE_COMMENT')
    expect(RATE_LIMITS).toHaveProperty('UPLOAD')
  })

  it('LOGIN has stricter window than API', () => {
    expect(RATE_LIMITS.LOGIN.windowMs).toBeGreaterThan(RATE_LIMITS.API.windowMs)
  })

  it('READ has higher limit than API', () => {
    expect(RATE_LIMITS.READ.limit).toBeGreaterThan(RATE_LIMITS.API.limit)
  })
})
