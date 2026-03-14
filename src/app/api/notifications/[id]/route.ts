import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { apiRateLimiter } from '@/lib/rate-limit'
import { notificationService } from '@/features/notification/services/notification.service'

export const PATCH = withAuth<{ id: string }>(
  { rateLimit: apiRateLimiter },
  async (user, _request, { id }) => {
    await notificationService.markRead(user, parseInt(id))
    return NextResponse.json({ success: true })
  }
)

export const DELETE = withAuth<{ id: string }>(
  { rateLimit: apiRateLimiter },
  async (user, _request, { id }) => {
    await notificationService.deleteById(user, parseInt(id))
    return NextResponse.json({ success: true })
  }
)
