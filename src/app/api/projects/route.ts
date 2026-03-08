import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { readRateLimiter, apiRateLimiter } from '@/lib/rate-limit'
import { projectService, createProjectSchema } from '@/features/project/services/project.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth({ rateLimit: readRateLimiter }, async user => {
  const projects = await projectService.list(user)
  return NextResponse.json(projects)
})

export const POST = withAuth({ rateLimit: apiRateLimiter }, async (user, request) => {
  const body = createProjectSchema.parse(await request.json())
  const project = await projectService.create(user, body)
  return NextResponse.json(project, { status: 201 })
})
