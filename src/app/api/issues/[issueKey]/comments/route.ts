import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/api-handler'
import { createCommentRateLimiter } from '@/lib/rate-limit'
import { commentService } from '@/features/issue/services/comment.service'

const createCommentBodySchema = z.object({
  content: z.string().min(1).max(50000),
  isInternal: z.boolean().optional().default(false),
})

/**
 * GET /api/issues/[issueKey]/comments
 */
export const GET = withAuth<{ issueKey: string }>(async (user, _request, { issueKey }) => {
  const result = await commentService.listByIssueKey(user, issueKey)
  return NextResponse.json(result)
})

/**
 * POST /api/issues/[issueKey]/comments
 */
export const POST = withAuth<{ issueKey: string }>(
  { rateLimit: createCommentRateLimiter },
  async (user, request, { issueKey }) => {
    const body = createCommentBodySchema.parse(await request.json())
    const comment = await commentService.createByIssueKey(user, issueKey, body)
    return NextResponse.json(comment, { status: 201 })
  }
)
