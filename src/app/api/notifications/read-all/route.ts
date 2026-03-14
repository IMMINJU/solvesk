import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { apiRateLimiter } from '@/lib/rate-limit'
import { notificationService } from '@/features/notification/services/notification.service'

export const PATCH = withAuth({ rateLimit: apiRateLimiter }, async user => {
  await notificationService.markAllRead(user)
  return NextResponse.json({ success: true })
})
