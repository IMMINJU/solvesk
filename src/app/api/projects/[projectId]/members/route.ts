import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { requireAdmin } from '@/lib/permissions'
import { apiRateLimiter, readRateLimiter } from '@/lib/rate-limit'
import { projectMembershipService } from '@/features/project/services/project-membership.service'
import { z } from 'zod'

const addMemberSchema = z.object({
  userId: z.string().min(1),
})

/**
 * GET /api/projects/[projectId]/members
 * List project members (admin only)
 */
export const GET = withAuth<{ projectId: string }>(
  { auth: requireAdmin, rateLimit: readRateLimiter },
  async (user, _request, { projectId }) => {
    const projectIdNum = parseInt(projectId)
    if (isNaN(projectIdNum)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const members = await projectMembershipService.listMembers(user, projectIdNum)
    return NextResponse.json(members)
  }
)

/**
 * POST /api/projects/[projectId]/members
 * Add agent to project (admin only)
 */
export const POST = withAuth<{ projectId: string }>(
  { auth: requireAdmin, rateLimit: apiRateLimiter },
  async (user, request, { projectId }) => {
    const projectIdNum = parseInt(projectId)
    if (isNaN(projectIdNum)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const body = addMemberSchema.parse(await request.json())
    await projectMembershipService.addMember(user, projectIdNum, body.userId)
    return NextResponse.json({ success: true }, { status: 201 })
  }
)

/**
 * DELETE /api/projects/[projectId]/members
 * Remove agent from project (admin only)
 * Body: { userId: string }
 */
export const DELETE = withAuth<{ projectId: string }>(
  { auth: requireAdmin, rateLimit: apiRateLimiter },
  async (user, request, { projectId }) => {
    const projectIdNum = parseInt(projectId)
    if (isNaN(projectIdNum)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const body = addMemberSchema.parse(await request.json())
    await projectMembershipService.removeMember(user, projectIdNum, body.userId)
    return NextResponse.json({ success: true })
  }
)
