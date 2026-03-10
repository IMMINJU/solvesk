import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { readRateLimiter, createIssueRateLimiter } from '@/lib/rate-limit'
import { PAGINATION } from '@/config/limits'
import { issueService, createIssueSchema } from '@/features/issue/services/issue.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth({ rateLimit: readRateLimiter }, async (user, request) => {
  const url = new URL(request.url)
  const result = await issueService.list(user, {
    page: Number(url.searchParams.get('page') ?? 1),
    pageSize: Number(url.searchParams.get('pageSize') ?? PAGINATION.defaultPageSize),
    status: url.searchParams.get('status') ?? undefined,
    priority: url.searchParams.get('priority') ?? undefined,
    assigneeId: url.searchParams.get('assigneeId') ?? undefined,
    projectId: url.searchParams.get('projectId')
      ? Number(url.searchParams.get('projectId'))
      : undefined,
    search: url.searchParams.get('search') ?? undefined,
    sortBy:
      (url.searchParams.get('sortBy') as 'newest' | 'oldest' | 'priority' | 'updated') ?? undefined,
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

export const POST = withAuth({ rateLimit: createIssueRateLimiter }, async (user, request) => {
  const body = createIssueSchema.parse(await request.json())
  const issue = await issueService.create(user, body)
  return NextResponse.json(issue, { status: 201 })
})
