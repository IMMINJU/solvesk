import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { readRateLimiter, apiRateLimiter } from '@/lib/rate-limit'
import { labelService, createLabelSchema } from '@/features/label/services/label.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth({ rateLimit: readRateLimiter }, async (_user, request) => {
  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page')) || undefined
  const pageSize = Number(searchParams.get('pageSize')) || undefined

  const result = await labelService.list({ page, pageSize })
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

export const POST = withAuth({ rateLimit: apiRateLimiter }, async (user, request) => {
  const body = createLabelSchema.parse(await request.json())
  const label = await labelService.create(user, body)
  return NextResponse.json(label, { status: 201 })
})
