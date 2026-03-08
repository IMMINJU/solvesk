import { db, projectMembers, users } from '@/db'
import { eq, and, inArray } from 'drizzle-orm'
import type { AuthenticatedUser } from '@/lib/permissions'
import { ForbiddenError, NotFoundError, ConflictError } from '@/lib/errors'

export interface ProjectMember {
  userId: string
  name: string | null
  email: string
  image: string | null
  role: string
  assignedAt: Date
}

class ProjectMembershipService {
  /**
   * List all agent members of a project.
   * Admins have implicit access — only agents appear in project_members.
   */
  async listMembers(user: AuthenticatedUser, projectId: number): Promise<ProjectMember[]> {
    if (user.role !== 'admin') throw new ForbiddenError()

    const rows = await db
      .select({
        userId: projectMembers.userId,
        name: users.name,
        email: users.email,
        image: users.image,
        role: users.role,
        assignedAt: projectMembers.createdAt,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId))

    return rows
  }

  /**
   * Add an agent to a project.
   */
  async addMember(user: AuthenticatedUser, projectId: number, agentUserId: string): Promise<void> {
    if (user.role !== 'admin') throw new ForbiddenError()

    // Verify agent exists and is an agent
    const agent = await db.query.users.findFirst({
      where: eq(users.id, agentUserId),
      columns: { id: true, role: true },
    })
    if (!agent) throw new NotFoundError('User')
    if (agent.role !== 'agent') {
      throw new ForbiddenError('Only agents can be added as project members')
    }

    // Check for existing membership
    const existing = await db.query.projectMembers.findFirst({
      where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, agentUserId)),
    })
    if (existing) throw new ConflictError('User is already a member')

    await db.insert(projectMembers).values({
      projectId,
      userId: agentUserId,
      assignedBy: user.id,
    })
  }

  /**
   * Remove an agent from a project.
   */
  async removeMember(
    user: AuthenticatedUser,
    projectId: number,
    agentUserId: string
  ): Promise<void> {
    if (user.role !== 'admin') throw new ForbiddenError()

    const existing = await db.query.projectMembers.findFirst({
      where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, agentUserId)),
    })
    if (!existing) throw new NotFoundError('Membership')

    await db
      .delete(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, agentUserId)))
  }

  /**
   * Get agents NOT already assigned to a project (for the "add member" UI).
   */
  async getAvailableAgents(
    user: AuthenticatedUser,
    projectId: number
  ): Promise<{ id: string; name: string | null; email: string }[]> {
    if (user.role !== 'admin') throw new ForbiddenError()

    // Get current members
    const currentMembers = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId))
    const memberIds = currentMembers.map(m => m.userId)

    // All agents minus current members
    const agents = await db.query.users.findMany({
      where:
        memberIds.length > 0
          ? and(
              eq(users.role, 'agent')
              // Filter out existing members using SQL NOT IN
              // Drizzle doesn't have notInArray, so use raw condition
            )
          : eq(users.role, 'agent'),
      columns: { id: true, name: true, email: true },
      orderBy: (users, { asc }) => [asc(users.name)],
    })

    // Filter in JS to avoid Drizzle notInArray limitations
    return agents.filter(a => !memberIds.includes(a.id))
  }

  /**
   * Check if a user can access a project (used by other services).
   */
  async canAccessProject(userId: string, projectId: number): Promise<boolean> {
    const membership = await db.query.projectMembers.findFirst({
      where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)),
    })
    return !!membership
  }
}

export const projectMembershipService = new ProjectMembershipService()
