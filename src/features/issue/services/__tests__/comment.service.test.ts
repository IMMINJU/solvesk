import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCommentSchema } from '../comment.service'
import type { AuthenticatedUser } from '@/lib/permissions'

// ============================================
// Mock setup
// ============================================

const mockFindFirst = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockReturning = vi.fn()

vi.mock('@/db', () => ({
  db: {
    query: {
      issues: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
      comments: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
    },
    insert: () => ({ values: () => ({ returning: () => mockReturning() }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => mockReturning() }) }) }),
    delete: () => ({ where: () => mockDelete() }),
  },
  comments: { id: 'comments.id', issueId: 'comments.issueId', authorId: 'comments.authorId' },
  issues: { id: 'issues.id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => args,
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeHtml: (content: string) => content,
}))

vi.mock('@/features/notification/services/notify', () => ({
  notifyCommentAdded: vi.fn(),
}))

vi.mock('@/lib/permissions-config', () => ({
  CUSTOMER_CONSTRAINTS: {
    comments: { canCreateInternalComments: false },
  },
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

describe('createCommentSchema', () => {
  it('accepts valid input', () => {
    const result = createCommentSchema.safeParse({
      issueId: 1,
      content: 'Test comment',
    })
    expect(result.success).toBe(true)
  })

  it('applies isInternal default to false', () => {
    const result = createCommentSchema.parse({
      issueId: 1,
      content: 'Test',
    })
    expect(result.isInternal).toBe(false)
  })

  it('accepts isInternal flag', () => {
    const result = createCommentSchema.safeParse({
      issueId: 1,
      content: 'Internal note',
      isInternal: true,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isInternal).toBe(true)
    }
  })

  it('requires issueId', () => {
    const result = createCommentSchema.safeParse({
      content: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('requires content', () => {
    const result = createCommentSchema.safeParse({
      issueId: 1,
      content: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects content over 50000 characters', () => {
    const result = createCommentSchema.safeParse({
      issueId: 1,
      content: 'x'.repeat(50001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts content at max length', () => {
    const result = createCommentSchema.safeParse({
      issueId: 1,
      content: 'x'.repeat(50000),
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-number issueId', () => {
    const result = createCommentSchema.safeParse({
      issueId: 'abc',
      content: 'Test',
    })
    expect(result.success).toBe(false)
  })
})

// ============================================
// Service method tests (with mocked DB)
// ============================================

describe('CommentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('rejects customer creating internal comment', async () => {
      // Re-import after mocks are set up
      const { commentService } = await import('../comment.service')

      await expect(
        commentService.create(customerUser, {
          issueId: 1,
          content: 'Internal note',
          isInternal: true,
        })
      ).rejects.toThrow('Access denied')
    })

    it('throws NotFound when issue does not exist', async () => {
      const { commentService } = await import('../comment.service')
      mockFindFirst.mockResolvedValueOnce(null)

      await expect(
        commentService.create(adminUser, {
          issueId: 999,
          content: 'Test',
        })
      ).rejects.toThrow('Issue not found')
    })

    it('rejects customer accessing issue from different project', async () => {
      const { commentService } = await import('../comment.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        projectId: 2, // Different from customer's projectId (1)
        isPrivate: false,
        reporterId: 'other',
      })

      await expect(
        commentService.create(customerUser, {
          issueId: 1,
          content: 'Test',
        })
      ).rejects.toThrow('Access denied')
    })

    it('rejects customer accessing private issue by another user', async () => {
      const { commentService } = await import('../comment.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        projectId: 1, // Same project
        isPrivate: true,
        reporterId: 'other-user', // Not this customer
      })

      await expect(
        commentService.create(customerUser, {
          issueId: 1,
          content: 'Test',
        })
      ).rejects.toThrow('Access denied')
    })

    it('allows customer to comment on own private issue', async () => {
      const { commentService } = await import('../comment.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        projectId: 1,
        isPrivate: true,
        reporterId: 'customer-1', // Same user
        issueKey: 'PROJ-1',
        assigneeId: null,
      })
      mockReturning.mockResolvedValueOnce([
        { id: 10, issueId: 1, content: 'Test', authorId: 'customer-1' },
      ])
      mockFindFirst.mockResolvedValueOnce({
        id: 10,
        content: 'Test',
        author: { id: 'customer-1', name: 'Customer', image: null },
      })

      const result = await commentService.create(customerUser, {
        issueId: 1,
        content: 'Test',
      })
      expect(result).toBeDefined()
      expect(result.id).toBe(10)
    })
  })

  describe('update', () => {
    it('throws NotFound when comment does not exist', async () => {
      const { commentService } = await import('../comment.service')
      mockFindFirst.mockResolvedValueOnce(null)

      await expect(commentService.update(adminUser, 999, 'Updated')).rejects.toThrow(
        'Comment not found'
      )
    })

    it("rejects updating other user's comment", async () => {
      const { commentService } = await import('../comment.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 'other-user',
      })

      await expect(commentService.update(agentUser, 1, 'Updated')).rejects.toThrow('Access denied')
    })

    it('allows updating own comment', async () => {
      const { commentService } = await import('../comment.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 'agent-1',
      })
      mockReturning.mockResolvedValueOnce([{ id: 1, content: 'Updated' }])

      const result = await commentService.update(agentUser, 1, 'Updated')
      expect(result).toBeDefined()
      expect(result.content).toBe('Updated')
    })

    it("admin cannot update other user's comment", async () => {
      const { commentService } = await import('../comment.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 'other-user',
      })

      // Even admin can only edit own comments
      await expect(commentService.update(adminUser, 1, 'Updated')).rejects.toThrow('Access denied')
    })
  })

  describe('delete', () => {
    it('throws NotFound when comment does not exist', async () => {
      const { commentService } = await import('../comment.service')
      mockFindFirst.mockResolvedValueOnce(null)

      await expect(commentService.delete(adminUser, 999)).rejects.toThrow('Comment not found')
    })

    it('admin can delete any comment', async () => {
      const { commentService } = await import('../comment.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 'other-user',
      })
      mockDelete.mockResolvedValueOnce(undefined)

      const result = await commentService.delete(adminUser, 1)
      expect(result).toEqual({ success: true })
    })

    it('non-admin can delete own comment', async () => {
      const { commentService } = await import('../comment.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 'agent-1',
      })
      mockDelete.mockResolvedValueOnce(undefined)

      const result = await commentService.delete(agentUser, 1)
      expect(result).toEqual({ success: true })
    })

    it("non-admin cannot delete other user's comment", async () => {
      const { commentService } = await import('../comment.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 'other-user',
      })

      await expect(commentService.delete(agentUser, 1)).rejects.toThrow('Access denied')
    })

    it("customer cannot delete other user's comment", async () => {
      const { commentService } = await import('../comment.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 'other-user',
      })

      await expect(commentService.delete(customerUser, 1)).rejects.toThrow('Access denied')
    })
  })
})
