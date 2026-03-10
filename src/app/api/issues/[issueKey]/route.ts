import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { readRateLimiter, apiRateLimiter } from '@/lib/rate-limit'
import { issueService, updateIssueSchema } from '@/features/issue/services/issue.service'

type Params = { issueKey: string }

export const GET = withAuth<Params>(
  { rateLimit: readRateLimiter },
  async (user, _request, params) => {
    const issue = await issueService.getByKey(user, params.issueKey)
    return NextResponse.json(issue)
  }
)

export const PATCH = withAuth<Params>(
  { rateLimit: apiRateLimiter },
  async (user, request, params) => {
    const body = updateIssueSchema.parse(await request.json())
    const issue = await issueService.update(user, params.issueKey, body)
    return NextResponse.json(issue)
  }
)

export const DELETE = withAuth<Params>(
  { rateLimit: apiRateLimiter },
  async (user, _request, params) => {
    await issueService.delete(user, params.issueKey)
    return NextResponse.json({ success: true })
  }
)
