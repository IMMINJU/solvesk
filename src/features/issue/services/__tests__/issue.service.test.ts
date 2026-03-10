import { describe, it, expect } from 'vitest'
import {
  createIssueSchema,
  updateIssueSchema,
  checkIssueAccess,
  filterCommentsForRole,
} from '../issue.service'

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
