import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { readRateLimiter } from '@/lib/rate-limit'
import { dashboardService } from '@/features/dashboard/services/dashboard.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth({ rateLimit: readRateLimiter }, async user => {
  const stats = await dashboardService.getStats(user)
  return NextResponse.json(stats)
})
