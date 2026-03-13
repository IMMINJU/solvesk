import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { requireAdmin } from '@/lib/permissions'
import { apiRateLimiter } from '@/lib/rate-limit'
import { userService, updateUserSchema } from '@/features/user/services/user.service'

export const PATCH = withAuth<{ userId: string }>(
  { auth: requireAdmin, rateLimit: apiRateLimiter },
  async (user, request, { userId }) => {
    const body = await request.json()
    const validated = updateUserSchema.parse(body)
    const result = await userService.updateByAdmin(user, userId, validated)
    return NextResponse.json(result)
  }
)

export const DELETE = withAuth<{ userId: string }>(
  { auth: requireAdmin, rateLimit: apiRateLimiter },
  async (user, _request, { userId }) => {
    const result = await userService.deleteByAdmin(user, userId)
    return NextResponse.json(result)
  }
)
