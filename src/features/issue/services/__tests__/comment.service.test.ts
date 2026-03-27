import { describe, it, expect } from 'vitest'
import { createCommentSchema } from '../comment.service'
import {
  canCreateInternalComment,
  canUpdateComment,
  canDeleteComment,
} from '../comment.permissions'
import type { AuthenticatedUser } from '@/lib/permissions'

// ============================================
// Test users
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
    const result = createCommentSchema.safeParse({ issueId: 1, content: 'Test comment' })
    expect(result.success).toBe(true)
  })

  it('applies isInternal default to false', () => {
    const result = createCommentSchema.parse({ issueId: 1, content: 'Test' })
    expect(result.isInternal).toBe(false)
  })

  it('accepts isInternal flag', () => {
    const result = createCommentSchema.safeParse({ issueId: 1, content: 'Internal note', isInternal: true })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.isInternal).toBe(true)
  })

  it('requires issueId', () => {
    const result = createCommentSchema.safeParse({ content: 'Test' })
    expect(result.success).toBe(false)
  })

  it('requires content', () => {
    const result = createCommentSchema.safeParse({ issueId: 1, content: '' })
    expect(result.success).toBe(false)
  })

  it('rejects content over 50000 characters', () => {
    const result = createCommentSchema.safeParse({ issueId: 1, content: 'x'.repeat(50001) })
    expect(result.success).toBe(false)
  })

  it('accepts content at max length', () => {
    const result = createCommentSchema.safeParse({ issueId: 1, content: 'x'.repeat(50000) })
    expect(result.success).toBe(true)
  })

  it('rejects non-number issueId', () => {
    const result = createCommentSchema.safeParse({ issueId: 'abc', content: 'Test' })
    expect(result.success).toBe(false)
  })
})

// ============================================
// Permission tests (pure functions, no mocks)
// ============================================

describe('canCreateInternalComment', () => {
  it('allows admin to create internal comment', () => {
    expect(canCreateInternalComment(adminUser)).toBe(true)
  })

  it('allows agent to create internal comment', () => {
    expect(canCreateInternalComment(agentUser)).toBe(true)
  })

  it('rejects customer from creating internal comment', () => {
    expect(canCreateInternalComment(customerUser)).toBe(false)
  })
})

describe('canUpdateComment', () => {
  it('allows user to update own comment', () => {
    expect(canUpdateComment(agentUser, { authorId: 'agent-1' })).toBe(true)
  })

  it("rejects updating other user's comment", () => {
    expect(canUpdateComment(agentUser, { authorId: 'other-user' })).toBe(false)
  })

  it("admin cannot update other user's comment", () => {
    expect(canUpdateComment(adminUser, { authorId: 'other-user' })).toBe(false)
  })
})

describe('canDeleteComment', () => {
  it('allows admin to delete any comment', () => {
    expect(canDeleteComment(adminUser, { authorId: 'other-user' })).toBe(true)
  })

  it('allows user to delete own comment', () => {
    expect(canDeleteComment(agentUser, { authorId: 'agent-1' })).toBe(true)
  })

  it("rejects non-admin from deleting other user's comment", () => {
    expect(canDeleteComment(agentUser, { authorId: 'other-user' })).toBe(false)
  })

  it("rejects customer from deleting other user's comment", () => {
    expect(canDeleteComment(customerUser, { authorId: 'other-user' })).toBe(false)
  })
})
