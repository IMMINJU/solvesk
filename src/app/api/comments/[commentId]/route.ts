import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/api-handler'
import { apiRateLimiter } from '@/lib/rate-limit'
import { commentService } from '@/features/issue/services/comment.service'

const updateCommentSchema = z.object({
  content: z.string().min(1).max(50000),
})

/**
 * PATCH /api/comments/[commentId]
 */
export const PATCH = withAuth<{ commentId: string }>(
  { rateLimit: apiRateLimiter },
  async (user, request, { commentId }) => {
    const id = parseInt(commentId)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 })
    }
    const { content } = updateCommentSchema.parse(await request.json())
    const result = await commentService.update(user, id, content)
    return NextResponse.json(result)
  }
)

/**
 * DELETE /api/comments/[commentId]
 */
export const DELETE = withAuth<{ commentId: string }>(
  { rateLimit: apiRateLimiter },
  async (user, _request, { commentId }) => {
    const id = parseInt(commentId)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 })
    }
    const result = await commentService.delete(user, id)
    return NextResponse.json(result)
  }
)
