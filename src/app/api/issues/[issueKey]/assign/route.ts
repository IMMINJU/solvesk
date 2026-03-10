import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/api-handler'
import { apiRateLimiter } from '@/lib/rate-limit'
import { issueService } from '@/features/issue/services/issue.service'

const updateAssigneeSchema = z.object({
  assigneeId: z.string().uuid().nullable().optional(),
})

type Params = { issueKey: string }

export const PATCH = withAuth<Params>(
  { rateLimit: apiRateLimiter },
  async (user, request, params) => {
    const { assigneeId } = updateAssigneeSchema.parse(await request.json())
    const issue = await issueService.updateAssignee(user, params.issueKey, assigneeId ?? null)
    return NextResponse.json(issue)
  }
)
