import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { readRateLimiter } from '@/lib/rate-limit'
import { projectService } from '@/features/project/services/project.service'

type Params = { code: string }

export const GET = withAuth<Params>(
  { rateLimit: readRateLimiter },
  async (user, _request, params) => {
    const project = await projectService.getByCode(user, params.code)
    return NextResponse.json(project)
  }
)
