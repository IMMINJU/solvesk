/**
 * API Route Handler HOF
 * Eliminates try/catch + auth + rate limiting boilerplate
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, type AuthenticatedUser } from './permissions'
import { handleApiError } from './error-handler'
import { createRateLimitErrorResponse } from './rate-limit'

type AuthFn = () => Promise<
  { user: AuthenticatedUser; error?: never } | { user?: never; error: NextResponse }
>

type RateLimiterType = {
  limit: (identifier: string) => Promise<{ success: boolean; reset: number }>
}

interface HandlerOptions {
  auth?: AuthFn
  rateLimit?: RateLimiterType
}

type Handler<P> = (user: AuthenticatedUser, request: NextRequest, params: P) => Promise<Response>

type RouteHandler<P> = (request: NextRequest, context: { params: Promise<P> }) => Promise<Response>

// Overload 1: handler only
export function withAuth<P = Record<string, never>>(handler: Handler<P>): RouteHandler<P>

// Overload 2: options + handler
export function withAuth<P = Record<string, never>>(
  options: HandlerOptions,
  handler: Handler<P>
): RouteHandler<P>

export function withAuth<P>(
  optionsOrHandler: HandlerOptions | Handler<P>,
  maybeHandler?: Handler<P>
) {
  const options = typeof optionsOrHandler === 'function' ? {} : optionsOrHandler
  const handler = typeof optionsOrHandler === 'function' ? optionsOrHandler : maybeHandler!

  return async (request: NextRequest, context?: { params: Promise<P> }): Promise<Response> => {
    try {
      const authFn = options.auth ?? requireAuth
      const authResult = await authFn()
      if (authResult.error) return authResult.error
      const { user } = authResult

      if (options.rateLimit) {
        const result = await options.rateLimit.limit(`user:${user.id}`)
        if (!result.success) return createRateLimitErrorResponse(result.reset)
      }

      const params = context?.params ? await context.params : (undefined as P)

      const response = await handler(user, request, params)

      // Add Cache-Control header to all authenticated responses
      if (response instanceof NextResponse) {
        response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
      }

      return response
    } catch (error) {
      return handleApiError(error)
    }
  }
}
