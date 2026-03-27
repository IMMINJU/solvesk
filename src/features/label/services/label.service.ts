import { db, labels, issueLabels, issues } from '@/db'
import { eq, and, count } from 'drizzle-orm'
import { z } from 'zod'
import { PAGINATION } from '@/config/limits'
import { NotFoundError, ForbiddenError, ConflictError } from '@/lib/errors'
import type { AuthenticatedUser } from '@/lib/permissions'
import { canManageLabel, canDeleteLabel } from './label.permissions'
import { checkIssueAccess } from '@/features/issue/services/issue.service'

// ============================================
// Validation Schemas
// ============================================

export const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  description: z.string().max(200).optional(),
})

export const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  description: z.string().max(200).nullable().optional(),
})

export type CreateLabelInput = z.infer<typeof createLabelSchema>
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>

// ============================================
// Types
// ============================================

export interface LabelListItem {
  id: number
  name: string
  color: string
  description: string | null
  createdBy: string
  createdAt: Date
}

export interface LabelListResult {
  data: LabelListItem[]
  total: number
  page: number
  pageSize: number
}

// ============================================
// Service
// ============================================

class LabelService {
  async list(params: { page?: number; pageSize?: number } = {}): Promise<LabelListResult> {
    const page = params.page ?? 1
    const pageSize = Math.min(params.pageSize ?? PAGINATION.defaultPageSize, PAGINATION.maxPageSize)

    const [totalResult] = await db.select({ count: count() }).from(labels)

    const data = await db.query.labels.findMany({
      columns: {
        id: true,
        name: true,
        color: true,
        description: true,
        createdBy: true,
        createdAt: true,
      },
      orderBy: (labels, { asc }) => [asc(labels.name)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    })

    return { data: data as LabelListItem[], total: totalResult.count, page, pageSize }
  }

  async getById(labelId: number) {
    const label = await db.query.labels.findFirst({
      where: eq(labels.id, labelId),
    })
    return label ?? null
  }

  async create(user: AuthenticatedUser, input: CreateLabelInput) {
    if (!canManageLabel(user)) {
      throw new ForbiddenError('Only staff can manage labels')
    }

    // Check name uniqueness
    const existing = await db.query.labels.findFirst({
      where: eq(labels.name, input.name),
    })
    if (existing) {
      throw new ConflictError('A label with this name already exists')
    }

    const [label] = await db
      .insert(labels)
      .values({
        name: input.name,
        color: input.color,
        description: input.description ?? null,
        createdBy: user.id,
      })
      .returning()

    return label
  }

  async update(user: AuthenticatedUser, labelId: number, input: UpdateLabelInput) {
    if (!canManageLabel(user)) {
      throw new ForbiddenError('Only staff can manage labels')
    }

    const label = await this.getById(labelId)
    if (!label) throw new NotFoundError('Label')

    // Check name uniqueness if name is being changed
    if (input.name && input.name !== label.name) {
      const existing = await db.query.labels.findFirst({
        where: eq(labels.name, input.name),
      })
      if (existing) {
        throw new ConflictError('A label with this name already exists')
      }
    }

    const [updated] = await db
      .update(labels)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.description !== undefined && { description: input.description }),
      })
      .where(eq(labels.id, labelId))
      .returning()

    return updated
  }

  async delete(user: AuthenticatedUser, labelId: number) {
    if (!canDeleteLabel(user)) {
      throw new ForbiddenError('Only admins can delete labels')
    }

    const label = await this.getById(labelId)
    if (!label) throw new NotFoundError('Label')

    await db.delete(labels).where(eq(labels.id, labelId))
    return { success: true }
  }

  async addToIssue(user: AuthenticatedUser, issueKey: string, labelId: number) {
    if (!canManageLabel(user)) {
      throw new ForbiddenError('Only staff can manage labels')
    }

    // Verify label exists
    const label = await this.getById(labelId)
    if (!label) throw new NotFoundError('Label')

    // Verify issue exists and user has access
    const issue = await db.query.issues.findFirst({
      where: eq(issues.issueKey, issueKey),
    })
    if (!issue) throw new NotFoundError('Issue')
    await checkIssueAccess(user, issue)

    // Check if already assigned (idempotent — don't error on duplicate)
    const existing = await db.query.issueLabels.findFirst({
      where: and(eq(issueLabels.issueId, issue.id), eq(issueLabels.labelId, labelId)),
    })
    if (existing) {
      return { success: true }
    }

    await db.insert(issueLabels).values({
      issueId: issue.id,
      labelId,
    })

    return { success: true }
  }

  async removeFromIssue(user: AuthenticatedUser, issueKey: string, labelId: number) {
    if (!canManageLabel(user)) {
      throw new ForbiddenError('Only staff can manage labels')
    }

    // Verify issue exists and user has access
    const issue = await db.query.issues.findFirst({
      where: eq(issues.issueKey, issueKey),
    })
    if (!issue) throw new NotFoundError('Issue')
    await checkIssueAccess(user, issue)

    await db
      .delete(issueLabels)
      .where(and(eq(issueLabels.issueId, issue.id), eq(issueLabels.labelId, labelId)))

    return { success: true }
  }
}

export const labelService = new LabelService()
