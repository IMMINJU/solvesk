import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { notificationService } from '@/features/notification/services/notification.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async user => {
  const count = await notificationService.unreadCount(user)
  return NextResponse.json({ count })
})
