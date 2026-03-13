import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { apiRateLimiter } from '@/lib/rate-limit'
import { userService, updateProfileSchema } from '@/features/user/services/user.service'

export const GET = withAuth(async user => {
  const profile = await userService.getProfile(user.id)
  return NextResponse.json(profile)
})

export const PATCH = withAuth({ rateLimit: apiRateLimiter }, async (user, request) => {
  const body = await request.json()
  const { name } = updateProfileSchema.parse(body)
  const result = await userService.updateProfile(user.id, { name })
  return NextResponse.json(result)
})
