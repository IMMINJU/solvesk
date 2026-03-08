import { db, projects, projectMembers, users } from '@/db'
import { eq, inArray, or } from 'drizzle-orm'
import { z } from 'zod'
import type { AuthenticatedUser } from '@/lib/permissions'
import { ForbiddenError, NotFoundError, ConflictError } from '@/lib/errors'
import { logAudit } from '@/lib/audit-logger'
import { APP_CONFIG } from '@/config/app'
import { buildPseudonymMap } from '@/lib/utils/pseudonym'

// ============================================
// Validation Schemas
// ============================================

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  code: z
    .string()
    .min(2)
    .max(10)
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      'Code must start with a letter and contain only uppercase letters, numbers, and underscores'
    ),
  description: z.string().max(1000).optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>

// ============================================
// Types
// ============================================

export interface ProjectListItem {
  id: number
  name: string
  code: string
  description: string | null
  issueCount: number
  createdAt: Date
}

// ============================================
// Service
// ============================================

class ProjectService {
  async list(user: AuthenticatedUser): Promise<ProjectListItem[]> {
    if (user.role === 'admin') {
      return db.query.projects.findMany({
        orderBy: (projects, { asc }) => [asc(projects.name)],
      })
    }

    if (user.role === 'customer') {
      if (!user.projectId) return []
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, user.projectId),
      })
      return project ? [project] : []
    }

    // Agent: only assigned projects
    const memberships = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, user.id))

    if (memberships.length === 0) return []

    const projectIds = memberships.map(m => m.projectId)
    return db.query.projects.findMany({
      where: inArray(projects.id, projectIds),
      orderBy: (projects, { asc }) => [asc(projects.name)],
    })
  }

  async getById(user: AuthenticatedUser, projectId: number) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    })

    if (!project) throw new NotFoundError('Project')

    await this.checkAccess(user, projectId)

    return project
  }

  async getByCode(user: AuthenticatedUser, code: string) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.code, code),
    })

    if (!project) throw new NotFoundError('Project')

    await this.checkAccess(user, project.id)

    return project
  }

  async create(user: AuthenticatedUser, input: CreateProjectInput) {
    if (user.role !== 'admin') throw new ForbiddenError()

    // Check unique code
    const existing = await db.query.projects.findFirst({
      where: eq(projects.code, input.code),
    })
    if (existing) throw new ConflictError('Project code already exists')

    const [project] = await db
      .insert(projects)
      .values({
        name: input.name,
        code: input.code,
        description: input.description ?? null,
      })
      .returning()

    await logAudit(user.id, 'create', 'project', String(project.id), {
      name: { after: project.name },
      code: { after: project.code },
    })

    return project
  }

  async update(user: AuthenticatedUser, projectId: number, input: UpdateProjectInput) {
    if (user.role !== 'admin') throw new ForbiddenError()

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    })
    if (!project) throw new NotFoundError('Project')

    const [updated] = await db
      .update(projects)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning()

    return updated
  }

  async delete(user: AuthenticatedUser, projectId: number) {
    if (user.role !== 'admin') throw new ForbiddenError()

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    })
    if (!project) throw new NotFoundError('Project')

    await db.delete(projects).where(eq(projects.id, projectId))

    await logAudit(user.id, 'delete', 'project', String(projectId), {
      name: { before: project.name },
      code: { before: project.code },
    })
  }

  async getProjectUsers(user: AuthenticatedUser, projectId: number) {
    // Customer can only see own project
    if (user.role === 'customer' && user.projectId !== projectId) {
      throw new ForbiddenError()
    }

    // Get project member IDs (agents assigned to this project)
    const members = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId))
    const memberIds = members.map(m => m.userId)

    // Build conditions: admins + project members
    const conditions = [eq(users.role, 'admin')]
    if (memberIds.length > 0) {
      conditions.push(inArray(users.id, memberIds))
    }

    const result = await db.query.users.findMany({
      where: or(...conditions),
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
      orderBy: (users, { asc }) => [asc(users.name)],
    })

    // Apply pseudonyms for customer users
    if (user.role === 'customer' && APP_CONFIG.pseudonym.enabled) {
      const staffIds = result.filter(u => u.role !== 'customer' && u.id !== user.id).map(u => u.id)
      const pseudonymMap = buildPseudonymMap(staffIds)

      return result.map(u => {
        if (pseudonymMap.has(u.id)) {
          return {
            ...u,
            name: pseudonymMap.get(u.id)!,
            email: undefined,
            image: null,
          }
        }
        return u
      })
    }

    return result
  }

  private async checkAccess(user: AuthenticatedUser, projectId: number): Promise<void> {
    if (user.role === 'admin') return

    if (user.role === 'customer') {
      if (user.projectId !== projectId) throw new ForbiddenError()
      return
    }

    // Agent
    const membership = await db.query.projectMembers.findFirst({
      where: (pm, { and, eq }) => and(eq(pm.projectId, projectId), eq(pm.userId, user.id)),
    })

    if (!membership) throw new ForbiddenError()
  }
}

export const projectService = new ProjectService()
