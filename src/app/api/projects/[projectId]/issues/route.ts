import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { readRateLimiter } from '@/lib/rate-limit'
import { PAGINATION } from '@/config/limits'
import { issueService } from '@/features/issue/services/issue.service'
import { projectService } from '@/features/project/services/project.service'

type Params = { projectId: string }

export const dynamic = 'force-dynamic'

export const GET = withAuth<Params>(
  { rateLimit: readRateLimiter },
  async (user, request, params) => {
    const projectId = Number(params.projectId)

    // Verifies access (throws ForbiddenError if denied)
    await projectService.getById(user, projectId)

    const url = new URL(request.url)
    const result = await issueService.list(user, {
      projectId,
      page: Number(url.searchParams.get('page') ?? 1),
      pageSize: Number(url.searchParams.get('pageSize') ?? PAGINATION.defaultPageSize),
      status: url.searchParams.get('status') ?? undefined,
      priority: url.searchParams.get('priority') ?? undefined,
      assigneeId: url.searchParams.get('assigneeId') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
      sortBy:
        (url.searchParams.get('sortBy') as 'newest' | 'oldest' | 'priority' | 'updated') ??
        undefined,
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
