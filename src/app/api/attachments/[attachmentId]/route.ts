import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { apiRateLimiter } from '@/lib/rate-limit'
import { attachmentService } from '@/features/issue/services/attachment.service'

/**
 * DELETE /api/attachments/[attachmentId]
 */
export const DELETE = withAuth<{ attachmentId: string }>(
  { rateLimit: apiRateLimiter },
  async (user, _request, { attachmentId }) => {
    const id = parseInt(attachmentId)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid attachment ID' }, { status: 400 })
    }
    const result = await attachmentService.deleteById(user, id)
    return NextResponse.json(result)
  }
)
