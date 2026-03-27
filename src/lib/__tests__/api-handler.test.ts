import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing
vi.mock('../permissions', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('next/server', () => {
  class MockHeaders {
    private map = new Map<string, string>()
    set(key: string, value: string) {
      this.map.set(key, value)
    }
    get(key: string) {
      return this.map.get(key)
    }
  }
  class MockNextResponse {
    body: unknown
    status: number
    headers: MockHeaders
    constructor(body: unknown, init?: { status?: number }) {
      this.body = body
      this.status = init?.status ?? 200
      this.headers = new MockHeaders()
    }
    static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      const resp = new MockNextResponse(data, init)
      if (init?.headers) {
        for (const [k, v] of Object.entries(init.headers)) {
          resp.headers.set(k, v)
        }
      }
      return resp
    }
  }
  return { NextResponse: MockNextResponse, NextRequest: class {} }
})

import { withAuth } from '../api-handler'
import { requireAuth } from '../permissions'
import { NextResponse } from 'next/server'

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test',
  role: 'admin' as const,
  projectId: null,
  image: null,
}

describe('withAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls handler with authenticated user', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: mockUser })

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const route = withAuth(handler)

    const request = {} as any
    const response = await route(request, { params: Promise.resolve({}) })

    expect(handler).toHaveBeenCalledWith(mockUser, request, {})
    expect(response).toBeDefined()
  })

  it('returns auth error when not authenticated', async () => {
    const authError = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    vi.mocked(requireAuth).mockResolvedValue({ error: authError } as any)

    const handler = vi.fn()
    const route = withAuth(handler)

    const response = await route({} as any, { params: Promise.resolve({}) })

    expect(handler).not.toHaveBeenCalled()
    expect((response as any).status).toBe(401)
  })

  it('applies rate limiting', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: mockUser })

    const rateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: false, reset: Date.now() + 10_000 }),
    }

    const handler = vi.fn()
    const route = withAuth({ rateLimit: rateLimiter }, handler)

    const response = await route({} as any, { params: Promise.resolve({}) })

    expect(rateLimiter.limit).toHaveBeenCalledWith('user:user-1')
    expect(handler).not.toHaveBeenCalled()
    expect((response as any).status).toBe(429)
  })

  it('passes rate limiting when under limit', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: mockUser })

    const rateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 10_000 }),
    }

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const route = withAuth({ rateLimit: rateLimiter }, handler)

    await route({} as any, { params: Promise.resolve({}) })

    expect(handler).toHaveBeenCalled()
  })

  it('uses custom auth function when provided', async () => {
    const customAuth = vi.fn().mockResolvedValue({ user: mockUser })
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))

    const route = withAuth({ auth: customAuth }, handler)
    await route({} as any, { params: Promise.resolve({}) })

    expect(customAuth).toHaveBeenCalled()
    expect(requireAuth).not.toHaveBeenCalled()
  })

  it('catches handler errors and returns error response', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: mockUser })

    const handler = vi.fn().mockRejectedValue(new Error('boom'))
    const route = withAuth(handler)

    const response = await route({} as any, { params: Promise.resolve({}) })

    expect((response as any).status).toBe(500)
  })

  it('resolves route params from context', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: mockUser })

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const route = withAuth(handler)

    const params = { issueKey: 'PROJ-1' }
    await route({} as any, { params: Promise.resolve(params) })

    expect(handler).toHaveBeenCalledWith(mockUser, expect.anything(), params)
  })

  it('adds Cache-Control header to NextResponse', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: mockUser })

    const resp = NextResponse.json({ ok: true })
    const handler = vi.fn().mockResolvedValue(resp)
    const route = withAuth(handler)

    const response = await route({} as any, { params: Promise.resolve({}) })

    expect((response as any).headers.get('Cache-Control')).toBe(
      'private, no-cache, no-store, must-revalidate'
    )
  })
})
