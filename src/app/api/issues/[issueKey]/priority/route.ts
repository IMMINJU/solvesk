import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/api-handler'
import { apiRateLimiter } from '@/lib/rate-limit'
import { issueService } from '@/features/issue/services/issue.service'
import { PRIORITIES } from '@/config/issue'

const updatePrioritySchema = z.object({
  priority: z.enum(PRIORITIES),
})

type Params = { issueKey: string }

export const PATCH = withAuth<Params>(
  { rateLimit: apiRateLimiter },
  async (user, request, params) => {
    const { priority } = updatePrioritySchema.parse(await request.json())
    const issue = await issueService.updatePriority(user, params.issueKey, priority)
    return NextResponse.json(issue)
  }
)
