import { describe, it, expect } from 'vitest'
import {
  createIssueSchema,
  updateIssueSchema,
  checkIssueAccess,
  filterCommentsForRole,
} from '../issue.service'
import {
  resolveCustomerIssueFields,
  canEditIssue,
  canAssignIssue,
  canChangeIssuePriority,
  canDeleteIssue,
  canCreateIssueInProject,
} from '../issue.permissions'
import type { AuthenticatedUser } from '@/lib/permissions'

describe('createIssueSchema', () => {
  it('accepts valid input', () => {
    const result = createIssueSchema.safeParse({
      projectId: 1,
      title: 'Test issue',
    })
    expect(result.success).toBe(true)
  })

  it('applies defaults', () => {
    const result = createIssueSchema.parse({
      projectId: 1,
      title: 'Test',
    })
    expect(result.type).toBe('bug')
    expect(result.priority).toBe('medium')
    expect(result.isPrivate).toBe(false)
  })

  it('requires projectId', () => {
    const result = createIssueSchema.safeParse({ title: 'Test' })
    expect(result.success).toBe(false)
  })

  it('requires title', () => {
    const result = createIssueSchema.safeParse({ projectId: 1, title: '' })
    expect(result.success).toBe(false)
  })

  it('rejects title over 500 chars', () => {
    const result = createIssueSchema.safeParse({
      projectId: 1,
      title: 'x'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('accepts all types', () => {
    for (const type of ['bug', 'feature', 'inquiry']) {
      const result = createIssueSchema.safeParse({
        projectId: 1,
        title: 'Test',
        type,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid type', () => {
    const result = createIssueSchema.safeParse({
      projectId: 1,
      title: 'Test',
      type: 'task',
    })
    expect(result.success).toBe(false)
  })
})

describe('updateIssueSchema', () => {
  it('accepts partial update', () => {
    const result = updateIssueSchema.safeParse({ title: 'Updated' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateIssueSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = updateIssueSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })
})

describe('checkIssueAccess', () => {
  const adminUser = {
    id: 'admin-1',
    email: 'admin@test.com',
    name: 'Admin',
    role: 'admin' as const,
    projectId: null,
    image: null,
  }

  const customerUser = {
    id: 'customer-1',
    email: 'customer@test.com',
    name: 'Customer',
    role: 'customer' as const,
    projectId: 1,
    image: null,
  }

  it('admin can access any issue', async () => {
    await expect(
      checkIssueAccess(adminUser, {
        projectId: 99,
        reporterId: 'other',
        isPrivate: true,
      })
    ).resolves.not.toThrow()
  })

  it('customer can access own issue', async () => {
    await expect(
      checkIssueAccess(customerUser, {
        projectId: 1,
        reporterId: 'customer-1',
        isPrivate: true,
      })
    ).resolves.not.toThrow()
  })

  it('customer can access public issue in own project', async () => {
    await expect(
      checkIssueAccess(customerUser, {
        projectId: 1,
        reporterId: 'other',
        isPrivate: false,
      })
    ).resolves.not.toThrow()
  })

  it('customer cannot access private issue by others', async () => {
    await expect(
      checkIssueAccess(customerUser, {
        projectId: 1,
        reporterId: 'other',
        isPrivate: true,
      })
    ).rejects.toThrow()
  })

  it('customer cannot access other project issues', async () => {
    await expect(
      checkIssueAccess(customerUser, {
        projectId: 2,
        reporterId: 'customer-1',
        isPrivate: false,
      })
    ).rejects.toThrow()
  })
})

describe('issue creation uses transaction', () => {
  it('create method source contains db.transaction and FOR UPDATE', async () => {
    // Structural test: verify the transaction pattern exists in the source
    // This ensures the race condition fix is maintained even after refactoring
    const fs = await import('fs')
    const path = await import('path')
    const source = fs.readFileSync(path.resolve(__dirname, '../issue.service.ts'), 'utf-8')

    // Must use db.transaction for atomic issueKey generation
    expect(source).toContain('db.transaction(')
    // Must lock the project row to prevent concurrent reads
    expect(source).toContain('FOR UPDATE')
    // Must read issue_count inside the transaction (from raw SQL)
    expect(source).toContain('issue_count')
  })
})

describe('filterCommentsForRole', () => {
  const comments = [
    { id: 1, isInternal: false, content: 'public' },
    { id: 2, isInternal: true, content: 'internal' },
    { id: 3, isInternal: false, content: 'public2' },
  ]

  it('filters internal comments for customers', () => {
    const result = filterCommentsForRole(comments, 'customer')
    expect(result).toHaveLength(2)
    expect(result.every(c => !c.isInternal)).toBe(true)
  })

  it('keeps all comments for admin', () => {
    const result = filterCommentsForRole(comments, 'admin')
    expect(result).toHaveLength(3)
  })

  it('keeps all comments for agent', () => {
    const result = filterCommentsForRole(comments, 'agent')
    expect(result).toHaveLength(3)
  })
})

// ============================================
// Customer field constraints (pure, no mocks)
// ============================================

const staffAdmin: AuthenticatedUser = {
  id: 'admin-1',
  email: 'admin@test.com',
  name: 'Admin',
  role: 'admin',
  projectId: null,
  image: null,
}

const staffAgent: AuthenticatedUser = {
  id: 'agent-1',
  email: 'agent@test.com',
  name: 'Agent',
  role: 'agent',
  projectId: null,
  image: null,
}

const customer: AuthenticatedUser = {
  id: 'customer-1',
  email: 'customer@test.com',
  name: 'Customer',
  role: 'customer',
  projectId: 1,
  image: null,
}

describe('resolveCustomerIssueFields', () => {
  it('forces safe defaults for a customer, ignoring what they sent', () => {
    const result = resolveCustomerIssueFields(customer, {
      assigneeId: 'agent-9',
      priority: 'urgent',
      dueDate: '2026-12-31',
    })
    expect(result).toEqual({ assigneeId: null, priority: 'medium', dueDate: null })
  })

  it('keeps the values staff passed', () => {
    const result = resolveCustomerIssueFields(staffAgent, {
      assigneeId: 'agent-2',
      priority: 'high',
      dueDate: '2026-12-31',
    })
    expect(result).toEqual({ assigneeId: 'agent-2', priority: 'high', dueDate: '2026-12-31' })
  })

  it('defaults staff omissions without forcing them', () => {
    const result = resolveCustomerIssueFields(staffAdmin, {})
    expect(result).toEqual({ assigneeId: null, priority: 'medium', dueDate: null })
  })
})

describe('canEditIssue', () => {
  it('lets a customer edit only their own issue', () => {
    expect(canEditIssue(customer, { reporterId: 'customer-1' })).toBe(true)
    expect(canEditIssue(customer, { reporterId: 'someone-else' })).toBe(false)
  })

  it('lets staff edit any issue', () => {
    expect(canEditIssue(staffAgent, { reporterId: 'someone-else' })).toBe(true)
    expect(canEditIssue(staffAdmin, { reporterId: 'someone-else' })).toBe(true)
  })
})

describe('canAssignIssue / canChangeIssuePriority', () => {
  it('lets staff assign and re-prioritise', () => {
    expect(canAssignIssue(staffAdmin)).toBe(true)
    expect(canAssignIssue(staffAgent)).toBe(true)
    expect(canChangeIssuePriority(staffAdmin)).toBe(true)
    expect(canChangeIssuePriority(staffAgent)).toBe(true)
  })

  it('blocks customers from both', () => {
    expect(canAssignIssue(customer)).toBe(false)
    expect(canChangeIssuePriority(customer)).toBe(false)
  })
})

describe('canDeleteIssue', () => {
  it('is admin-only', () => {
    expect(canDeleteIssue(staffAdmin)).toBe(true)
    expect(canDeleteIssue(staffAgent)).toBe(false)
    expect(canDeleteIssue(customer)).toBe(false)
  })
})

describe('canCreateIssueInProject', () => {
  it('lets admin create in any project', () => {
    expect(canCreateIssueInProject(staffAdmin, 999, { isMember: false })).toBe(true)
  })

  it('lets a customer create only in their own project', () => {
    expect(canCreateIssueInProject(customer, 1, { isMember: false })).toBe(true)
    expect(canCreateIssueInProject(customer, 2, { isMember: false })).toBe(false)
  })

  it('lets an agent create only where assigned', () => {
    expect(canCreateIssueInProject(staffAgent, 1, { isMember: true })).toBe(true)
    expect(canCreateIssueInProject(staffAgent, 1, { isMember: false })).toBe(false)
  })
})
