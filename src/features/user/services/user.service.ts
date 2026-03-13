import { db, users, projects, projectMembers } from '@/db'
import { eq, count, and, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import type { AuthenticatedUser } from '@/lib/permissions'
import { AppError, NotFoundError, ConflictError, ForbiddenError } from '@/lib/errors'
import { logAudit } from '@/lib/audit-logger'
import { PAGINATION } from '@/config/limits'

// ── Types ──────────────────────────────────────

export interface UserListItem {
  id: string
  name: string | null
  email: string
  role: string
  image: string | null
  projectId: number | null
  project: { id: number; name: string; code: string } | null
  createdAt: Date
}

export interface UserListResult {
  data: UserListItem[]
  total: number
  page: number
  pageSize: number
}

// ── Validation Schemas ─────────────────────────

export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
  role: z.enum(['admin', 'agent', 'customer']),
  projectId: z.number().int().positive().optional().nullable(),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  role: z.enum(['admin', 'agent', 'customer']).optional(),
  projectId: z.number().int().positive().optional().nullable(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>

// ── Service ────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
})

export const onboardingSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
})

class UserService {
  async needsOnboarding(): Promise<boolean> {
    const [{ count: userCount }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(users)
    return userCount === 0
  }

  async createFirstAdmin(input: z.infer<typeof onboardingSchema>) {
    const [{ count: userCount }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(users)

    if (userCount > 0) {
      throw new AppError('Onboarding already completed', 'VALIDATION_ERROR', 400)
    }

    const hashedPassword = await bcrypt.hash(input.password, 12)

    const [admin] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email.toLowerCase(),
        password: hashedPassword,
        role: 'admin',
        mustChangePassword: false,
      })
      .returning({ id: users.id, email: users.email })

    return admin
  }

  async getProfile(userId: string) {
    const profile = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        projectId: true,
        createdAt: true,
      },
    })
    return profile
  }

  async updateProfile(userId: string, data: { name: string }) {
    const [updated] = await db
      .update(users)
      .set({ name: data.name.trim(), updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        image: users.image,
        projectId: users.projectId,
        createdAt: users.createdAt,
      })
    return updated
  }

  async list(params: { page?: number; pageSize?: number } = {}): Promise<UserListResult> {
    const page = params.page ?? 1
    const pageSize = Math.min(params.pageSize ?? PAGINATION.defaultPageSize, PAGINATION.maxPageSize)

    const [totalResult] = await db.select({ count: count() }).from(users)

    const data = await db.query.users.findMany({
      with: {
        project: { columns: { id: true, name: true, code: true } },
      },
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        projectId: true,
        createdAt: true,
      },
      orderBy: (users, { asc }) => [asc(users.name)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    })

    return { data: data as UserListItem[], total: totalResult.count, page, pageSize }
  }

  async getById(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        project: { columns: { id: true, name: true, code: true } },
      },
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        projectId: true,
        createdAt: true,
      },
    })

    if (!user) throw new NotFoundError('User')
    return user
  }

  async create(admin: AuthenticatedUser, input: CreateUserInput) {
    // Check duplicate email
    const existing = await db.query.users.findFirst({
      where: eq(users.email, input.email.toLowerCase()),
      columns: { id: true },
    })
    if (existing) throw new ConflictError('A user with this email already exists')

    // Customer must have a projectId
    if (input.role === 'customer' && !input.projectId) {
      throw new ForbiddenError('Customer must be assigned to a project')
    }

    // Verify project exists if projectId provided
    if (input.projectId) {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, input.projectId),
        columns: { id: true },
      })
      if (!project) throw new NotFoundError('Project')
    }

    const hashedPassword = await bcrypt.hash(input.password, 12)

    const [newUser] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email.toLowerCase(),
        password: hashedPassword,
        role: input.role,
        projectId: input.role === 'customer' ? input.projectId : null,
        mustChangePassword: true,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        projectId: users.projectId,
        createdAt: users.createdAt,
      })

    await logAudit(admin.id, 'create', 'user', newUser.id, {
      email: { after: input.email },
      role: { after: input.role },
    })

    return newUser
  }

  async updateByAdmin(admin: AuthenticatedUser, userId: string, input: UpdateUserInput) {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, email: true, role: true, name: true, projectId: true },
    })
    if (!targetUser) throw new NotFoundError('User')

    // Cannot edit yourself via admin panel
    if (admin.id === userId) {
      throw new ForbiddenError('Cannot edit your own account from the admin panel')
    }

    // If changing email, check for duplicates
    if (input.email && input.email.toLowerCase() !== targetUser.email) {
      const existing = await db.query.users.findFirst({
        where: and(eq(users.email, input.email.toLowerCase()), ne(users.id, userId)),
        columns: { id: true },
      })
      if (existing) throw new ConflictError('A user with this email already exists')
    }

    // Customer must have a projectId
    const newRole = input.role ?? targetUser.role
    if (newRole === 'customer' && input.projectId === null) {
      throw new ForbiddenError('Customer must be assigned to a project')
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (input.name !== undefined) updateData.name = input.name
    if (input.email !== undefined) updateData.email = input.email.toLowerCase()
    if (input.role !== undefined) updateData.role = input.role
    if (input.projectId !== undefined) {
      updateData.projectId = newRole === 'customer' ? input.projectId : null
    }

    const [updated] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      projectId: users.projectId,
    })

    await logAudit(admin.id, 'update', 'user', userId, {
      role: { before: targetUser.role, after: input.role ?? targetUser.role },
    })

    return updated
  }

  async deleteByAdmin(admin: AuthenticatedUser, userId: string) {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, email: true, name: true, role: true },
    })
    if (!targetUser) throw new NotFoundError('User')

    if (admin.id === userId) {
      throw new ForbiddenError('Cannot delete your own account')
    }

    // Remove project memberships first
    await db.delete(projectMembers).where(eq(projectMembers.userId, userId))

    await db.delete(users).where(eq(users.id, userId))

    await logAudit(admin.id, 'delete', 'user', userId, {
      email: { before: targetUser.email },
      name: { before: targetUser.name },
    })

    return { success: true }
  }

  async resetPassword(admin: AuthenticatedUser, userId: string) {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, email: true, name: true },
    })
    if (!targetUser) throw new NotFoundError('User')

    // Generate a random temporary password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let temporaryPassword = ''
    for (let i = 0; i < 12; i++) {
      temporaryPassword += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    const hashedPassword = await bcrypt.hash(temporaryPassword, 12)

    await db
      .update(users)
      .set({
        password: hashedPassword,
        mustChangePassword: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))

    await logAudit(admin.id, 'reset_password', 'user', userId, {
      email: { before: targetUser.email },
    })

    return { success: true, temporaryPassword }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, password: true },
    })

    if (!dbUser?.password) {
      throw new NotFoundError('User')
    }

    const isValid = await bcrypt.compare(currentPassword, dbUser.password)
    if (!isValid) {
      throw new AppError('Current password is incorrect', 'VALIDATION_ERROR', 400)
    }

    const hashed = await bcrypt.hash(newPassword, 12)

    await db
      .update(users)
      .set({
        password: hashed,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))

    await logAudit(userId, 'change_password', 'user', userId)

    return { success: true }
  }
}

export const userService = new UserService()
