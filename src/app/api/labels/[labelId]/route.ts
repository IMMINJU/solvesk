import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { apiRateLimiter } from '@/lib/rate-limit'
import { requireAdmin } from '@/lib/permissions'
import { labelService, updateLabelSchema } from '@/features/label/services/label.service'

type Params = { labelId: string }

export const PATCH = withAuth<Params>(
  { rateLimit: apiRateLimiter },
  async (user, request, params) => {
    const body = updateLabelSchema.parse(await request.json())
    const label = await labelService.update(user, Number(params.labelId), body)
    return NextResponse.json(label)
  }
)

export const DELETE = withAuth<Params>(
  { auth: requireAdmin, rateLimit: apiRateLimiter },
  async (user, _request, params) => {
    await labelService.delete(user, Number(params.labelId))
    return NextResponse.json({ success: true })
  }
)
