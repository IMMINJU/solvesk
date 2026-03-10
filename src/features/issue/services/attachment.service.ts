import { db, attachments, issues } from '@/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { NotFoundError, ForbiddenError } from '@/lib/errors'
import type { AuthenticatedUser } from '@/lib/permissions'
import { checkIssueAccess } from '@/features/issue/services/issue.service'

// ============================================
// Validation
// ============================================

export const addAttachmentsSchema = z.object({
  attachments: z
    .array(
      z.object({
        fileName: z.string().min(1).max(255),
        fileUrl: z.string().min(1),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
      })
    )
    .min(1)
    .max(20),
})

export type AddAttachmentsInput = z.infer<typeof addAttachmentsSchema>

// ============================================
// Service
// ============================================

class AttachmentService {
  async getByIssueKey(user: AuthenticatedUser, issueKey: string) {
    const issue = await db.query.issues.findFirst({
      where: eq(issues.issueKey, issueKey),
    })
    if (!issue) throw new NotFoundError('Issue')

    await checkIssueAccess(user, issue)

    return this.getByIssueId(issue.id)
  }

  async addToIssueByKey(user: AuthenticatedUser, issueKey: string, input: AddAttachmentsInput) {
    const issue = await db.query.issues.findFirst({
      where: eq(issues.issueKey, issueKey),
    })
    if (!issue) throw new NotFoundError('Issue')

    await checkIssueAccess(user, issue)

    return this.addToIssue(user, issue.id, input)
  }

  async addToIssue(user: AuthenticatedUser, issueId: number, input: AddAttachmentsInput) {
    const newAttachments = await db
      .insert(attachments)
      .values(
        input.attachments.map(att => ({
          issueId,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileSize: att.fileSize ?? null,
          mimeType: att.mimeType ?? null,
          uploadedBy: user.id,
        }))
      )
      .returning()

    return newAttachments
  }

  async getByIssueId(issueId: number) {
    return db.query.attachments.findMany({
      where: eq(attachments.issueId, issueId),
      with: {
        uploader: { columns: { id: true, name: true } },
      },
    })
  }

  async deleteById(user: AuthenticatedUser, attachmentId: number) {
    const attachment = await db.query.attachments.findFirst({
      where: eq(attachments.id, attachmentId),
    })

    if (!attachment) throw new NotFoundError('Attachment')

    // Admin can delete any, others can only delete own uploads
    if (user.role !== 'admin' && attachment.uploadedBy !== user.id) {
      throw new ForbiddenError()
    }

    await db.delete(attachments).where(eq(attachments.id, attachmentId))
    return { success: true }
  }
}

export const attachmentService = new AttachmentService()
