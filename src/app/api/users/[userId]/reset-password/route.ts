import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { requireAdmin } from '@/lib/permissions'
import { apiRateLimiter } from '@/lib/rate-limit'
import { userService } from '@/features/user/services/user.service'

export const POST = withAuth<{ userId: string }>(
  { auth: requireAdmin, rateLimit: apiRateLimiter },
  async (user, _request, { userId }) => {
    const result = await userService.resetPassword(user, userId)
    return NextResponse.json(result)
  }
)
