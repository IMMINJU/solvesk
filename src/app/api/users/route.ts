import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { requireAdmin } from '@/lib/permissions'
import { apiRateLimiter, readRateLimiter } from '@/lib/rate-limit'
import { PAGINATION } from '@/config/limits'
import { userService, createUserSchema } from '@/features/user/services/user.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth(
  { auth: requireAdmin, rateLimit: readRateLimiter },
  async (_user, request) => {
    const url = new URL(request.url)
    const result = await userService.list({
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
  }
)

export const POST = withAuth(
  { auth: requireAdmin, rateLimit: apiRateLimiter },
  async (user, request) => {
    const body = await request.json()
    const validated = createUserSchema.parse(body)
    const result = await userService.create(user, validated)
    return NextResponse.json(result, { status: 201 })
  }
)
