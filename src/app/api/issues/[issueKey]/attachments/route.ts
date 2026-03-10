import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { apiRateLimiter } from '@/lib/rate-limit'
import {
  attachmentService,
  addAttachmentsSchema,
} from '@/features/issue/services/attachment.service'

/**
 * GET /api/issues/[issueKey]/attachments
 */
export const GET = withAuth<{ issueKey: string }>(async (user, _request, { issueKey }) => {
  const result = await attachmentService.getByIssueKey(user, issueKey)
  return NextResponse.json(result)
})

/**
 * POST /api/issues/[issueKey]/attachments
 */
export const POST = withAuth<{ issueKey: string }>(
  { rateLimit: apiRateLimiter },
  async (user, request, { issueKey }) => {
    const input = addAttachmentsSchema.parse(await request.json())
    const result = await attachmentService.addToIssueByKey(user, issueKey, input)
    return NextResponse.json(result, { status: 201 })
  }
)
