import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/api-handler'
import { apiRateLimiter } from '@/lib/rate-limit'
import { labelService } from '@/features/label/services/label.service'

const issueLabelSchema = z.object({
  labelId: z.number(),
})

type Params = { issueKey: string }

export const POST = withAuth<Params>(
  { rateLimit: apiRateLimiter },
  async (user, request, params) => {
    const { labelId } = issueLabelSchema.parse(await request.json())
    const result = await labelService.addToIssue(user, params.issueKey, labelId)
    return NextResponse.json(result)
  }
)

export const DELETE = withAuth<Params>(
  { rateLimit: apiRateLimiter },
  async (user, request, params) => {
    const { labelId } = issueLabelSchema.parse(await request.json())
    const result = await labelService.removeFromIssue(user, params.issueKey, labelId)
    return NextResponse.json(result)
  }
)
