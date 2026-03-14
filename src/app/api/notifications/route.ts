import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { readRateLimiter, apiRateLimiter } from '@/lib/rate-limit'
import { PAGINATION } from '@/config/limits'
import { notificationService } from '@/features/notification/services/notification.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth({ rateLimit: readRateLimiter }, async (user, request) => {
  const url = new URL(request.url)
  const result = await notificationService.list(user, {
    page: Number(url.searchParams.get('page') ?? 1),
    pageSize: Number(url.searchParams.get('pageSize') ?? PAGINATION.defaultPageSize),
  })
  return NextResponse.json({
    data: result.data,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / result.pageSize),
    },
  })
})

export const DELETE = withAuth({ rateLimit: apiRateLimiter }, async user => {
  await notificationService.deleteAll(user)
  return NextResponse.json({ success: true })
})
