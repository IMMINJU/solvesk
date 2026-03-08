import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { projectService } from '@/features/project/services/project.service'

/**
 * GET /api/projects/[projectId]/users
 * Returns users assignable to this project (admins + project agents + project customers)
 */
export const GET = withAuth<{ projectId: string }>(async (user, _request, { projectId }) => {
  const projectIdNum = parseInt(projectId)
  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  const result = await projectService.getProjectUsers(user, projectIdNum)
  return NextResponse.json(result)
})
