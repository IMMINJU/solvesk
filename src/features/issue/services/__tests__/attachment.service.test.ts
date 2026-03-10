import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addAttachmentsSchema } from '../attachment.service'
import type { AuthenticatedUser } from '@/lib/permissions'

// ============================================
// Mock setup
// ============================================

const mockFindFirst = vi.fn()
const mockFindMany = vi.fn()
const mockReturning = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/db', () => ({
  db: {
    query: {
      attachments: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
    },
    insert: () => ({ values: () => ({ returning: () => mockReturning() }) }),
    delete: () => ({ where: () => mockDelete() }),
  },
  attachments: {
    id: 'attachments.id',
    issueId: 'attachments.issueId',
    uploadedBy: 'attachments.uploadedBy',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => args,
}))

// ============================================
// Test data
// ============================================

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  email: 'admin@test.com',
  name: 'Admin',
  role: 'admin',
  projectId: null,
  image: null,
}

const agentUser: AuthenticatedUser = {
  id: 'agent-1',
  email: 'agent@test.com',
  name: 'Agent',
  role: 'agent',
  projectId: null,
  image: null,
}

const customerUser: AuthenticatedUser = {
  id: 'customer-1',
  email: 'customer@test.com',
  name: 'Customer',
  role: 'customer',
  projectId: 1,
  image: null,
}

// ============================================
// Schema tests
// ============================================

describe('addAttachmentsSchema', () => {
  it('accepts valid input with single attachment', () => {
    const result = addAttachmentsSchema.safeParse({
      attachments: [{ fileName: 'test.pdf', fileUrl: '/uploads/test.pdf' }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts attachment with all optional fields', () => {
    const result = addAttachmentsSchema.safeParse({
      attachments: [
        {
          fileName: 'test.pdf',
          fileUrl: '/uploads/test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepts multiple attachments', () => {
    const result = addAttachmentsSchema.safeParse({
      attachments: [
        { fileName: 'a.pdf', fileUrl: '/uploads/a.pdf' },
        { fileName: 'b.png', fileUrl: '/uploads/b.png' },
        { fileName: 'c.doc', fileUrl: '/uploads/c.doc' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty attachments array', () => {
    const result = addAttachmentsSchema.safeParse({
      attachments: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects more than 20 attachments', () => {
    const attachments = Array.from({ length: 21 }, (_, i) => ({
      fileName: `file-${i}.pdf`,
      fileUrl: `/uploads/file-${i}.pdf`,
    }))
    const result = addAttachmentsSchema.safeParse({ attachments })
    expect(result.success).toBe(false)
  })

  it('accepts exactly 20 attachments', () => {
    const attachments = Array.from({ length: 20 }, (_, i) => ({
      fileName: `file-${i}.pdf`,
      fileUrl: `/uploads/file-${i}.pdf`,
    }))
    const result = addAttachmentsSchema.safeParse({ attachments })
    expect(result.success).toBe(true)
  })

  it('rejects attachment with empty fileName', () => {
    const result = addAttachmentsSchema.safeParse({
      attachments: [{ fileName: '', fileUrl: '/uploads/test.pdf' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects attachment with empty fileUrl', () => {
    const result = addAttachmentsSchema.safeParse({
      attachments: [{ fileName: 'test.pdf', fileUrl: '' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects fileName over 255 characters', () => {
    const result = addAttachmentsSchema.safeParse({
      attachments: [{ fileName: 'x'.repeat(256), fileUrl: '/uploads/test.pdf' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing attachments field', () => {
    const result = addAttachmentsSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ============================================
// Service method tests (with mocked DB)
// ============================================

describe('AttachmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addToIssue', () => {
    it('inserts attachments and returns them', async () => {
      const { attachmentService } = await import('../attachment.service')
      const mockAttachments = [
        {
          id: 1,
          issueId: 5,
          fileName: 'test.pdf',
          fileUrl: '/uploads/test.pdf',
          uploadedBy: 'agent-1',
        },
      ]
      mockReturning.mockResolvedValueOnce(mockAttachments)

      const result = await attachmentService.addToIssue(agentUser, 5, {
        attachments: [{ fileName: 'test.pdf', fileUrl: '/uploads/test.pdf' }],
      })

      expect(result).toEqual(mockAttachments)
    })

    it('inserts multiple attachments at once', async () => {
      const { attachmentService } = await import('../attachment.service')
      const mockAttachments = [
        { id: 1, issueId: 5, fileName: 'a.pdf', fileUrl: '/uploads/a.pdf', uploadedBy: 'agent-1' },
        { id: 2, issueId: 5, fileName: 'b.png', fileUrl: '/uploads/b.png', uploadedBy: 'agent-1' },
      ]
      mockReturning.mockResolvedValueOnce(mockAttachments)

      const result = await attachmentService.addToIssue(agentUser, 5, {
        attachments: [
          { fileName: 'a.pdf', fileUrl: '/uploads/a.pdf' },
          { fileName: 'b.png', fileUrl: '/uploads/b.png' },
        ],
      })

      expect(result).toHaveLength(2)
    })
  })

  describe('getByIssueId', () => {
    it('returns attachments for issue', async () => {
      const { attachmentService } = await import('../attachment.service')
      const mockData = [{ id: 1, fileName: 'test.pdf', uploader: { id: 'agent-1', name: 'Agent' } }]
      mockFindMany.mockResolvedValueOnce(mockData)

      const result = await attachmentService.getByIssueId(5)
      expect(result).toEqual(mockData)
    })

    it('returns empty array when no attachments', async () => {
      const { attachmentService } = await import('../attachment.service')
      mockFindMany.mockResolvedValueOnce([])

      const result = await attachmentService.getByIssueId(999)
      expect(result).toEqual([])
    })
  })

  describe('deleteById', () => {
    it('throws NotFound when attachment does not exist', async () => {
      const { attachmentService } = await import('../attachment.service')
      mockFindFirst.mockResolvedValueOnce(null)

      await expect(attachmentService.deleteById(adminUser, 999)).rejects.toThrow(
        'Attachment not found'
      )
    })

    it('admin can delete any attachment', async () => {
      const { attachmentService } = await import('../attachment.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        uploadedBy: 'other-user',
      })
      mockDelete.mockResolvedValueOnce(undefined)

      const result = await attachmentService.deleteById(adminUser, 1)
      expect(result).toEqual({ success: true })
    })

    it('user can delete own upload', async () => {
      const { attachmentService } = await import('../attachment.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        uploadedBy: 'agent-1',
      })
      mockDelete.mockResolvedValueOnce(undefined)

      const result = await attachmentService.deleteById(agentUser, 1)
      expect(result).toEqual({ success: true })
    })

    it("non-admin cannot delete other user's upload", async () => {
      const { attachmentService } = await import('../attachment.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        uploadedBy: 'other-user',
      })

      await expect(attachmentService.deleteById(agentUser, 1)).rejects.toThrow('Access denied')
    })

    it("customer cannot delete other user's upload", async () => {
      const { attachmentService } = await import('../attachment.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        uploadedBy: 'other-user',
      })

      await expect(attachmentService.deleteById(customerUser, 1)).rejects.toThrow('Access denied')
    })

    it('customer can delete own upload', async () => {
      const { attachmentService } = await import('../attachment.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        uploadedBy: 'customer-1',
      })
      mockDelete.mockResolvedValueOnce(undefined)

      const result = await attachmentService.deleteById(customerUser, 1)
      expect(result).toEqual({ success: true })
    })
  })
})
