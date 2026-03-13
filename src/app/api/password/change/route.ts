import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { apiRateLimiter } from '@/lib/rate-limit'
import { userService, changePasswordSchema } from '@/features/user/services/user.service'

export const POST = withAuth({ rateLimit: apiRateLimiter }, async (user, request) => {
  const body = await request.json()
  const { currentPassword, newPassword } = changePasswordSchema.parse(body)
  const result = await userService.changePassword(user.id, currentPassword, newPassword)
  return NextResponse.json(result)
})
