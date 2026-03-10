import { db, comments, issues } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { NotFoundError, ForbiddenError } from '@/lib/errors'
import { CUSTOMER_CONSTRAINTS } from '@/lib/permissions-config'
import type { AuthenticatedUser } from '@/lib/permissions'
import { checkIssueAccess } from '@/features/issue/services/issue.service'
import { notifyCommentAdded } from '@/features/notification/services/notify'
import { sanitizeHtml } from '@/lib/sanitize'
import { APP_CONFIG } from '@/config/app'
import { buildPseudonymMap, applyPseudonym } from '@/lib/utils/pseudonym'

export const createCommentSchema = z.object({
  issueId: z.number(),
  content: z.string().min(1).max(50000),
  isInternal: z.boolean().optional().default(false),
})

export type CreateCommentInput = z.input<typeof createCommentSchema>

class CommentService {
  async listByIssueKey(user: AuthenticatedUser, issueKey: string) {
    const issue = await db.query.issues.findFirst({
      where: eq(issues.issueKey, issueKey),
    })
    if (!issue) throw new NotFoundError('Issue')

    await checkIssueAccess(user, issue)

    // Filter internal comments for customers
    const whereCondition =
      user.role === 'customer'
        ? and(eq(comments.issueId, issue.id), eq(comments.isInternal, false))
        : eq(comments.issueId, issue.id)

    const result = await db.query.comments.findMany({
      where: whereCondition,
      with: {
        author: { columns: { id: true, name: true, image: true } },
      },
      orderBy: (comments, { asc }) => [asc(comments.createdAt)],
    })

    // Apply pseudonyms for customer users
    if (user.role === 'customer' && APP_CONFIG.pseudonym.enabled) {
      const staffIds = result
        .filter(c => c.author && c.author.id !== user.id)
        .map(c => c.author!.id)
      const pseudonymMap = buildPseudonymMap(staffIds)

      return result.map(c => {
        if (c.author && pseudonymMap.has(c.author.id)) {
          return { ...c, author: applyPseudonym(c.author, pseudonymMap) }
        }
        return c
      })
    }

    return result
  }

  async createByIssueKey(
    user: AuthenticatedUser,
    issueKey: string,
    body: { content: string; isInternal?: boolean }
  ) {
    const issue = await db.query.issues.findFirst({
      where: eq(issues.issueKey, issueKey),
    })
    if (!issue) throw new NotFoundError('Issue')

    await checkIssueAccess(user, issue)

    return this.create(user, {
      issueId: issue.id,
      content: body.content,
      isInternal: body.isInternal,
    })
  }

  async create(user: AuthenticatedUser, input: CreateCommentInput) {
    // Customer cannot create internal comments
    if (user.role === 'customer' && input.isInternal) {
      throw new ForbiddenError()
    }

    const issue = await db.query.issues.findFirst({
      where: eq(issues.id, input.issueId),
    })
    if (!issue) throw new NotFoundError('Issue')

    // Access check (covers customer isolation + agent project membership)
    await checkIssueAccess(user, issue)

    const [comment] = await db
      .insert(comments)
      .values({
        issueId: input.issueId,
        content: sanitizeHtml(input.content),
        authorId: user.id,
        isInternal: input.isInternal ?? false,
      })
      .returning()

    // Return with author info
    const created = await db.query.comments.findFirst({
      where: eq(comments.id, comment.id),
      with: {
        author: { columns: { id: true, name: true, image: true } },
      },
    })

    // Notify reporter + assignee
    notifyCommentAdded({
      type: 'comment_added',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: user.id,
      actorName: user.name ?? 'Unknown',
      reporterId: issue.reporterId,
      assigneeId: issue.assigneeId,
      isInternal: input.isInternal ?? false,
    })

    return created!
  }

  async update(user: AuthenticatedUser, commentId: number, content: string) {
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
    })
    if (!comment) throw new NotFoundError('Comment')

    // Only own comments
    if (comment.authorId !== user.id) throw new ForbiddenError()

    const [updated] = await db
      .update(comments)
      .set({ content: sanitizeHtml(content), updatedAt: new Date() })
      .where(eq(comments.id, commentId))
      .returning()

    return updated
  }

  async delete(user: AuthenticatedUser, commentId: number) {
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
    })
    if (!comment) throw new NotFoundError('Comment')

    // Admin can delete any, others only own
    if (user.role !== 'admin' && comment.authorId !== user.id) {
      throw new ForbiddenError()
    }

    await db.delete(comments).where(eq(comments.id, commentId))
    return { success: true }
  }
}

export const commentService = new CommentService()
