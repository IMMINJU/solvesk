import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/api-handler'
import { apiRateLimiter } from '@/lib/rate-limit'
import { issueService } from '@/features/issue/services/issue.service'
import { STATUSES } from '@/config/issue'

const updateStatusSchema = z.object({
  status: z.enum(STATUSES),
})

type Params = { issueKey: string }

export const PATCH = withAuth<Params>(
  { rateLimit: apiRateLimiter },
  async (user, request, params) => {
    const { status } = updateStatusSchema.parse(await request.json())
    const issue = await issueService.updateStatus(user, params.issueKey, status)
    return NextResponse.json(issue)
  }
)
