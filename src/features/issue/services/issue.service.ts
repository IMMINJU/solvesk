import { db, issues, projects, projectMembers, issueLabels, labels, comments } from '@/db'
import { PAGINATION } from '@/config/limits'
import { eq, and, or, desc, asc, sql, inArray, ilike, count } from 'drizzle-orm'
import { z } from 'zod'
import type { AuthenticatedUser } from '@/lib/permissions'
import { ForbiddenError, NotFoundError } from '@/lib/errors'
import { CUSTOMER_CONSTRAINTS, canCustomerChangeStatus } from '@/lib/permissions-config'
import { logAudit } from '@/lib/audit-logger'
import { APP_CONFIG } from '@/config/app'
import { sanitizeHtml } from '@/lib/sanitize'
import { buildPseudonymMap, applyPseudonym } from '@/lib/utils/pseudonym'
import {
  notifyIssueCreated,
  notifyIssueAssigned,
  notifyStatusChanged,
  notifyPriorityChanged,
} from '@/features/notification/services/notify'

// ============================================
// Validation Schemas
// ============================================

export const createIssueSchema = z.object({
  projectId: z.number(),
  title: z.string().min(1).max(500),
  content: z.string().max(50000).optional(),
  type: z.enum(['bug', 'feature', 'inquiry']).default('bug'),
  priority: z.enum(['urgent', 'high', 'medium', 'low']).default('medium'),
  assigneeId: z.string().nullable().optional(),
  isPrivate: z.boolean().optional().default(false),
  dueDate: z.string().nullable().optional(),
})

export const updateIssueSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(50000).nullable().optional(),
  type: z.enum(['bug', 'feature', 'inquiry']).optional(),
  dueDate: z.string().nullable().optional(),
})

export type CreateIssueInput = z.input<typeof createIssueSchema>
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>

export interface IssueListParams {
  page?: number
  pageSize?: number
  status?: string
  priority?: string
  assigneeId?: string
  search?: string
  projectId?: number
  sort?: string
  sortBy?: 'newest' | 'oldest' | 'priority' | 'updated'
}

export interface IssueListResult {
  data: IssueListItem[]
  total: number
  page: number
  pageSize: number
}

export interface IssueListItem {
  id: number
  issueKey: string
  title: string
  status: string
  priority: string
  type: string
  isPrivate: boolean
  createdAt: Date
  updatedAt: Date
  reporter: { id: string; name: string | null; image: string | null } | null
  assignee: { id: string; name: string | null; image: string | null } | null
  project: { id: number; code: string; name: string } | null
}

function getOrderBy(sortBy?: string) {
  switch (sortBy) {
    case 'oldest':
      return [asc(issues.createdAt)]
    case 'priority':
      return [asc(issues.priority), desc(issues.createdAt)]
    case 'updated':
      return [desc(issues.updatedAt)]
    case 'newest':
    default:
      return [desc(issues.createdAt)]
  }
}

class IssueService {
  async list(user: AuthenticatedUser, params: IssueListParams = {}): Promise<IssueListResult> {
    const page = params.page ?? 1
    const pageSize = Math.min(params.pageSize ?? PAGINATION.defaultPageSize, PAGINATION.maxPageSize)

    // Build conditions
    const conditions = await this.buildAccessConditions(user, params)

    // Count
    const [totalResult] = await db
      .select({ count: count() })
      .from(issues)
      .where(and(...conditions))
    const total = totalResult.count

    // Query with relations
    const data = await db.query.issues.findMany({
      where: and(...conditions),
      with: {
        reporter: { columns: { id: true, name: true, image: true } },
        assignee: { columns: { id: true, name: true, image: true } },
        project: { columns: { id: true, code: true, name: true } },
      },
      orderBy: getOrderBy(params.sortBy),
      limit: pageSize,
      offset: (page - 1) * pageSize,
    })

    // Apply pseudonyms for customer users
    if (user.role === 'customer' && APP_CONFIG.pseudonym.enabled) {
      // Collect all staff IDs across all issues for consistent numbering
      const staffIds: string[] = []
      for (const issue of data) {
        if (issue.reporter && issue.reporter.id !== user.id) {
          staffIds.push(issue.reporter.id)
        }
        if (issue.assignee && issue.assignee.id !== user.id) {
          staffIds.push(issue.assignee.id)
        }
      }
      const pseudonymMap = buildPseudonymMap(staffIds)

      for (const issue of data) {
        if (issue.reporter && pseudonymMap.has(issue.reporter.id)) {
          issue.reporter = applyPseudonym(issue.reporter, pseudonymMap)
        }
        if (issue.assignee && pseudonymMap.has(issue.assignee.id)) {
          issue.assignee = applyPseudonym(issue.assignee, pseudonymMap)
        }
      }
    }

    return { data, total, page, pageSize }
  }

  async getByKey(user: AuthenticatedUser, issueKey: string) {
    const issue = await db.query.issues.findFirst({
      where: eq(issues.issueKey, issueKey),
      with: {
        reporter: { columns: { id: true, name: true, email: true, image: true } },
        assignee: { columns: { id: true, name: true, email: true, image: true } },
        project: { columns: { id: true, code: true, name: true } },
        comments: {
          with: {
            author: { columns: { id: true, name: true, image: true } },
          },
          orderBy: (comments, { asc }) => [asc(comments.createdAt)],
        },
        issueLabels: {
          with: { label: true },
        },
      },
    })

    if (!issue) throw new NotFoundError('Issue')

    // Access check
    await this.checkAccess(user, issue)

    // Filter internal comments for customers
    if (user.role === 'customer') {
      issue.comments = issue.comments.filter(c => !c.isInternal)
    }

    // Apply pseudonyms for customer users
    if (user.role === 'customer' && APP_CONFIG.pseudonym.enabled) {
      return this.applyPseudonyms(issue, user.id)
    }

    return issue
  }

  async create(user: AuthenticatedUser, input: CreateIssueInput) {
    // Customer constraints: strip fields they can't set
    const assigneeId = user.role === 'customer' ? null : (input.assigneeId ?? null)
    const priority = user.role === 'customer' ? ('medium' as const) : input.priority
    const dueDate = user.role === 'customer' ? null : input.dueDate ? new Date(input.dueDate) : null

    // Access check (before transaction to fail fast)
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, input.projectId),
    })
    if (!project) throw new NotFoundError('Project')

    if (user.role === 'customer' && user.projectId !== input.projectId) {
      throw new ForbiddenError()
    }
    if (user.role === 'agent') {
      const membership = await db.query.projectMembers.findFirst({
        where: and(
          eq(projectMembers.projectId, input.projectId),
          eq(projectMembers.userId, user.id)
        ),
      })
      if (!membership) throw new ForbiddenError()
    }

    // Atomic: increment issueCount + insert issue (transaction with row lock)
    const issue = await db.transaction(async tx => {
      // Lock the project row to prevent concurrent issueCount reads
      const [lockedProject] = await tx.execute(
        sql`SELECT * FROM projects WHERE id = ${input.projectId} FOR UPDATE`
      )
      if (!lockedProject) throw new NotFoundError('Project')

      const newIssueNumber = (lockedProject.issue_count as number) + 1
      const issueKey = `${project.code}-${newIssueNumber}`

      await tx
        .update(projects)
        .set({ issueCount: newIssueNumber, updatedAt: new Date() })
        .where(eq(projects.id, input.projectId))

      const [created] = await tx
        .insert(issues)
        .values({
          projectId: input.projectId,
          issueNumber: newIssueNumber,
          issueKey,
          title: input.title,
          content: input.content ? sanitizeHtml(input.content) : null,
          type: input.type,
          status: 'open',
          priority,
          reporterId: user.id,
          assigneeId,
          isPrivate: input.isPrivate,
          dueDate,
        })
        .returning()

      return created
    })

    // Fire-and-forget notifications
    notifyIssueCreated({
      type: 'issue_created',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: user.id,
      actorName: user.name ?? 'Unknown',
      projectId: input.projectId,
    })

    if (assigneeId) {
      notifyIssueAssigned({
        type: 'issue_assigned',
        issueId: issue.id,
        issueKey: issue.issueKey,
        actorId: user.id,
        actorName: user.name ?? 'Unknown',
        assigneeId,
      })
    }

    return issue
  }

  async update(user: AuthenticatedUser, issueKey: string, input: UpdateIssueInput) {
    const issue = await db.query.issues.findFirst({
      where: eq(issues.issueKey, issueKey),
    })
    if (!issue) throw new NotFoundError('Issue')

    await this.checkAccess(user, issue)

    // Customers can only update title/content of own issues
    if (user.role === 'customer' && issue.reporterId !== user.id) {
      throw new ForbiddenError()
    }

    // Customers cannot set dueDate
    const { dueDate: dueDateStr, ...restInput } = input
    const sanitizedInput: Record<string, unknown> = {
      ...restInput,
      ...(restInput.content !== undefined && {
        content: restInput.content ? sanitizeHtml(restInput.content) : null,
      }),
    }

    // Convert dueDate string to Date for Drizzle (staff only)
    if (
      dueDateStr !== undefined &&
      CUSTOMER_CONSTRAINTS.issues.canSetDueDate === false &&
      user.role === 'customer'
    ) {
      // Silently ignore dueDate for customers
    } else if (dueDateStr !== undefined) {
      sanitizedInput.dueDate = dueDateStr ? new Date(dueDateStr) : null
    }

    const [updated] = await db
      .update(issues)
      .set({ ...sanitizedInput, updatedAt: new Date() })
      .where(eq(issues.issueKey, issueKey))
      .returning()

    return updated
  }

  async updateStatus(user: AuthenticatedUser, issueKey: string, status: string) {
    const issue = await db.query.issues.findFirst({
      where: eq(issues.issueKey, issueKey),
    })
    if (!issue) throw new NotFoundError('Issue')

    await this.checkAccess(user, issue)

    // Customer constraint: only "resolved"
    if (user.role === 'customer' && !canCustomerChangeStatus(status)) {
      throw new ForbiddenError('Customers can only set status to resolved')
    }

    const [updated] = await db
      .update(issues)
      .set({
        status: status as (typeof issues.status.enumValues)[number],
        updatedAt: new Date(),
      })
      .where(eq(issues.issueKey, issueKey))
      .returning()

    // Notify reporter
    notifyStatusChanged({
      type: 'issue_status_changed',
      issueId: issue.id,
      issueKey,
      actorId: user.id,
      actorName: user.name ?? 'Unknown',
      reporterId: issue.reporterId,
    })

    return updated
  }

  async updateAssignee(user: AuthenticatedUser, issueKey: string, assigneeId: string | null) {
    if (user.role === 'customer') throw new ForbiddenError()

    const issue = await db.query.issues.findFirst({
      where: eq(issues.issueKey, issueKey),
    })
    if (!issue) throw new NotFoundError('Issue')

    await this.checkAccess(user, issue)

    const [updated] = await db
      .update(issues)
      .set({ assigneeId, updatedAt: new Date() })
      .where(eq(issues.issueKey, issueKey))
      .returning()

    // Notify new assignee
    if (assigneeId) {
      notifyIssueAssigned({
        type: 'issue_assigned',
        issueId: issue.id,
        issueKey,
        actorId: user.id,
        actorName: user.name ?? 'Unknown',
        assigneeId,
      })
    }

    return updated
  }

  async updatePriority(user: AuthenticatedUser, issueKey: string, priority: string) {
    if (user.role === 'customer') throw new ForbiddenError()

    const issue = await db.query.issues.findFirst({
      where: eq(issues.issueKey, issueKey),
    })
    if (!issue) throw new NotFoundError('Issue')

    await this.checkAccess(user, issue)

    const [updated] = await db
      .update(issues)
      .set({
        priority: priority as (typeof issues.priority.enumValues)[number],
        updatedAt: new Date(),
      })
      .where(eq(issues.issueKey, issueKey))
      .returning()

    // Notify reporter
    notifyPriorityChanged({
      type: 'issue_priority_changed',
      issueId: issue.id,
      issueKey,
      actorId: user.id,
      actorName: user.name ?? 'Unknown',
      reporterId: issue.reporterId,
    })

    return updated
  }

  async delete(user: AuthenticatedUser, issueKey: string) {
    if (user.role !== 'admin') throw new ForbiddenError()

    const issue = await db.query.issues.findFirst({
      where: eq(issues.issueKey, issueKey),
    })
    if (!issue) throw new NotFoundError('Issue')

    await db.delete(issues).where(eq(issues.issueKey, issueKey))

    await logAudit(user.id, 'delete', 'issue', String(issue.id), {
      title: { before: issue.title },
      issueKey: { before: issueKey },
    })
  }

  /**
   * Replace staff names/emails with pseudonyms for customer-facing responses.
   * The customer's own data is preserved; all other users get masked.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyPseudonyms(issue: any, customerId: string) {
    // Collect all non-customer user IDs
    const staffIds: string[] = []
    if (issue.reporter && issue.reporter.id !== customerId) {
      staffIds.push(issue.reporter.id)
    }
    if (issue.assignee && issue.assignee.id !== customerId) {
      staffIds.push(issue.assignee.id)
    }
    if (issue.comments) {
      for (const comment of issue.comments) {
        if (comment.author && comment.author.id !== customerId) {
          staffIds.push(comment.author.id)
        }
      }
    }

    const pseudonymMap = buildPseudonymMap(staffIds)

    if (issue.reporter && pseudonymMap.has(issue.reporter.id)) {
      issue.reporter = applyPseudonym(issue.reporter, pseudonymMap)
    }
    if (issue.assignee && pseudonymMap.has(issue.assignee.id)) {
      issue.assignee = applyPseudonym(issue.assignee, pseudonymMap)
    }
    if (issue.comments) {
      for (const comment of issue.comments) {
        if (comment.author && pseudonymMap.has(comment.author.id)) {
          comment.author = applyPseudonym(comment.author, pseudonymMap)
        }
      }
    }

    return issue
  }

  private async checkAccess(
    user: AuthenticatedUser,
    issue: { projectId: number; reporterId: string; isPrivate: boolean }
  ) {
    await checkIssueAccess(user, issue)
  }

  private async buildAccessConditions(user: AuthenticatedUser, params: IssueListParams) {
    const conditions: ReturnType<typeof eq>[] = []

    // Role-based project filtering
    if (user.role === 'admin') {
      // Admin sees all
    } else if (user.role === 'customer') {
      // Customer: own issues + public issues in their project
      conditions.push(
        or(
          eq(issues.reporterId, user.id),
          and(eq(issues.projectId, user.projectId!), eq(issues.isPrivate, false))
        )!
      )
    } else {
      // Agent: only assigned projects
      const memberships = await db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, user.id))
      const projectIds = memberships.map(m => m.projectId)
      if (projectIds.length > 0) {
        conditions.push(inArray(issues.projectId, projectIds))
      } else {
        // No projects assigned, return nothing
        conditions.push(sql`false`)
      }
    }

    // Filters
    if (params.status) {
      conditions.push(eq(issues.status, params.status as (typeof issues.status.enumValues)[number]))
    }
    if (params.priority) {
      conditions.push(
        eq(issues.priority, params.priority as (typeof issues.priority.enumValues)[number])
      )
    }
    if (params.assigneeId) {
      conditions.push(eq(issues.assigneeId, params.assigneeId))
    }
    if (params.projectId) {
      conditions.push(eq(issues.projectId, params.projectId))
    }
    if (params.search) {
      conditions.push(ilike(issues.title, `%${params.search}%`))
    }

    return conditions
  }
}

export const issueService = new IssueService()

/**
 * Check if a user can access a specific issue.
 * Extracted for testability.
 */
export async function checkIssueAccess(
  user: AuthenticatedUser,
  issue: { projectId: number; reporterId: string; isPrivate: boolean }
): Promise<void> {
  if (user.role === 'admin') return

  if (user.role === 'customer') {
    if (issue.projectId !== user.projectId) {
      throw new ForbiddenError()
    }
    if (issue.isPrivate && issue.reporterId !== user.id) {
      throw new ForbiddenError()
    }
    return
  }

  // Agent: must be assigned to the project
  if (user.role === 'agent') {
    const membership = await db.query.projectMembers.findFirst({
      where: and(eq(projectMembers.projectId, issue.projectId), eq(projectMembers.userId, user.id)),
    })
    if (!membership) throw new ForbiddenError()
  }
}

/**
 * Filter internal comments for customers.
 * Extracted for testability.
 */
export function filterCommentsForRole<T extends { isInternal: boolean }>(
  comments: T[],
  role: string
): T[] {
  if (role === 'customer') {
    return comments.filter(c => !c.isInternal)
  }
  return comments
}
