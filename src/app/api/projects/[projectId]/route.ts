import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { readRateLimiter, apiRateLimiter } from '@/lib/rate-limit'
import { projectService, updateProjectSchema } from '@/features/project/services/project.service'

type Params = { projectId: string }

export const GET = withAuth<Params>(
  { rateLimit: readRateLimiter },
  async (user, _request, params) => {
    const project = await projectService.getById(user, Number(params.projectId))
    return NextResponse.json(project)
  }
)

export const PATCH = withAuth<Params>(
  { rateLimit: apiRateLimiter },
  async (user, request, params) => {
    const body = updateProjectSchema.parse(await request.json())
    const project = await projectService.update(user, Number(params.projectId), body)
    return NextResponse.json(project)
  }
)

export const DELETE = withAuth<Params>(
  { rateLimit: apiRateLimiter },
  async (user, _request, params) => {
    await projectService.delete(user, Number(params.projectId))
    return NextResponse.json({ success: true })
  }
)
