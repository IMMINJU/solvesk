import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LabelListItem, LabelListResult } from '../label.service'
import type { AuthenticatedUser } from '@/lib/permissions'

// ============================================
// Mock setup
// ============================================

const mockFindMany = vi.fn()
const mockFindFirst = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

const mockIssueLabelsFindFirst = vi.fn()

// Chain helpers
const mockReturning = vi.fn()
const mockWhere = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/db', () => ({
  db: {
    query: {
      labels: {
        findMany: (...args: unknown[]) => mockFindMany(...args),
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
      issues: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
      issueLabels: {
        findFirst: (...args: unknown[]) => mockIssueLabelsFindFirst(...args),
      },
    },
    select: () => ({ from: () => mockSelect() }),
    insert: () => ({
      values: () => ({
        returning: () => mockReturning(),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => mockReturning(),
        }),
      }),
    }),
    delete: () => ({
      where: () => mockDelete(),
    }),
  },
  labels: { id: 'labels.id', name: 'labels.name' },
  issueLabels: { issueId: 'issueLabels.issueId', labelId: 'issueLabels.labelId' },
  issues: { issueKey: 'issues.issueKey' },
}))

vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args,
  count: () => 'count',
}))

vi.mock('@/config/limits', () => ({
  PAGINATION: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
}))

vi.mock('@/lib/errors', () => ({
  NotFoundError: class NotFoundError extends Error {
    constructor(resource: string = 'Resource') {
      super(`${resource} not found`)
      this.name = 'NotFoundError'
    }
  },
  ForbiddenError: class ForbiddenError extends Error {
    constructor(message: string = 'Access denied') {
      super(message)
      this.name = 'ForbiddenError'
    }
  },
  ConflictError: class ConflictError extends Error {
    constructor(message: string = 'Resource already exists') {
      super(message)
      this.name = 'ConflictError'
    }
  },
}))

vi.mock('@/lib/permissions-config', () => ({
  isStaff: (role: string) => role === 'admin' || role === 'agent',
  isAdmin: (role: string) => role === 'admin',
}))

vi.mock('@/features/issue/services/issue.service', () => ({
  checkIssueAccess: vi.fn().mockResolvedValue(undefined),
}))

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
// Type tests
// ============================================

describe('LabelListItem type', () => {
  it('has required fields', () => {
    const item: LabelListItem = {
      id: 1,
      name: 'Bug',
      color: '#ff0000',
      description: 'Bug label',
      createdBy: 'user-1',
      createdAt: new Date(),
    }
    expect(item.id).toBe(1)
    expect(item.name).toBe('Bug')
    expect(item.color).toBe('#ff0000')
  })

  it('allows null description', () => {
    const item: LabelListItem = {
      id: 1,
      name: 'Feature',
      color: '#00ff00',
      description: null,
      createdBy: 'user-1',
      createdAt: new Date(),
    }
    expect(item.description).toBeNull()
  })
})

describe('LabelListResult type', () => {
  it('has pagination fields', () => {
    const result: LabelListResult = {
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
    }
    expect(result.total).toBe(0)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(20)
  })

  it('contains LabelListItem array in data', () => {
    const result: LabelListResult = {
      data: [
        {
          id: 1,
          name: 'Bug',
          color: '#ff0000',
          description: null,
          createdBy: 'user-1',
          createdAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    }
    expect(result.data).toHaveLength(1)
    expect(result.data[0].name).toBe('Bug')
  })
})

// ============================================
// Service method tests (with mocked DB)
// ============================================

describe('LabelService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns paginated label list with defaults', async () => {
      const { labelService } = await import('../label.service')
      mockSelect.mockResolvedValueOnce([{ count: 2 }])
      mockFindMany.mockResolvedValueOnce([
        {
          id: 1,
          name: 'Bug',
          color: '#ff0000',
          description: null,
          createdBy: 'user-1',
          createdAt: new Date(),
        },
        {
          id: 2,
          name: 'Feature',
          color: '#00ff00',
          description: 'Features',
          createdBy: 'user-1',
          createdAt: new Date(),
        },
      ])

      const result = await labelService.list()
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
      expect(result.data).toHaveLength(2)
    })

    it('respects custom page and pageSize', async () => {
      const { labelService } = await import('../label.service')
      mockSelect.mockResolvedValueOnce([{ count: 50 }])
      mockFindMany.mockResolvedValueOnce([])

      const result = await labelService.list({ page: 3, pageSize: 10 })
      expect(result.page).toBe(3)
      expect(result.pageSize).toBe(10)
    })

    it('caps pageSize at maxPageSize (100)', async () => {
      const { labelService } = await import('../label.service')
      mockSelect.mockResolvedValueOnce([{ count: 0 }])
      mockFindMany.mockResolvedValueOnce([])

      const result = await labelService.list({ pageSize: 500 })
      expect(result.pageSize).toBe(100)
    })

    it('returns empty data array when no labels', async () => {
      const { labelService } = await import('../label.service')
      mockSelect.mockResolvedValueOnce([{ count: 0 }])
      mockFindMany.mockResolvedValueOnce([])

      const result = await labelService.list()
      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })

    it('defaults page to 1 when not provided', async () => {
      const { labelService } = await import('../label.service')
      mockSelect.mockResolvedValueOnce([{ count: 0 }])
      mockFindMany.mockResolvedValueOnce([])

      const result = await labelService.list({})
      expect(result.page).toBe(1)
    })
  })

  describe('getById', () => {
    it('returns label when found', async () => {
      const { labelService } = await import('../label.service')
      const mockLabel = {
        id: 1,
        name: 'Bug',
        color: '#ff0000',
        description: null,
        createdBy: 'user-1',
        createdAt: new Date(),
      }
      mockFindFirst.mockResolvedValueOnce(mockLabel)

      const result = await labelService.getById(1)
      expect(result).toEqual(mockLabel)
    })

    it('returns null when label not found', async () => {
      const { labelService } = await import('../label.service')
      mockFindFirst.mockResolvedValueOnce(undefined)

      const result = await labelService.getById(999)
      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('creates a label for admin user', async () => {
      const { labelService } = await import('../label.service')
      const newLabel = {
        id: 1,
        name: 'Bug',
        color: '#ff0000',
        description: null,
        createdBy: adminUser.id,
        createdAt: new Date(),
      }
      // findFirst for uniqueness check returns nothing
      mockFindFirst.mockResolvedValueOnce(undefined)
      mockReturning.mockResolvedValueOnce([newLabel])

      const result = await labelService.create(adminUser, {
        name: 'Bug',
        color: '#ff0000',
      })
      expect(result).toEqual(newLabel)
    })

    it('creates a label for agent user', async () => {
      const { labelService } = await import('../label.service')
      const newLabel = {
        id: 2,
        name: 'Feature',
        color: '#00ff00',
        description: 'Feature requests',
        createdBy: agentUser.id,
        createdAt: new Date(),
      }
      mockFindFirst.mockResolvedValueOnce(undefined)
      mockReturning.mockResolvedValueOnce([newLabel])

      const result = await labelService.create(agentUser, {
        name: 'Feature',
        color: '#00ff00',
        description: 'Feature requests',
      })
      expect(result).toEqual(newLabel)
    })

    it('throws ForbiddenError for customer user', async () => {
      const { labelService } = await import('../label.service')
      await expect(
        labelService.create(customerUser, { name: 'Bug', color: '#ff0000' })
      ).rejects.toThrow('Only staff can manage labels')
    })

    it('throws ConflictError when name already exists', async () => {
      const { labelService } = await import('../label.service')
      // findFirst returns existing label
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        name: 'Bug',
        color: '#ff0000',
      })

      await expect(
        labelService.create(adminUser, { name: 'Bug', color: '#ff0000' })
      ).rejects.toThrow('A label with this name already exists')
    })
  })

  describe('update', () => {
    it('updates a label for admin user', async () => {
      const { labelService } = await import('../label.service')
      const existingLabel = {
        id: 1,
        name: 'Bug',
        color: '#ff0000',
        description: null,
        createdBy: 'user-1',
        createdAt: new Date(),
      }
      const updatedLabel = { ...existingLabel, color: '#cc0000' }

      // getById
      mockFindFirst.mockResolvedValueOnce(existingLabel)
      // update returning
      mockReturning.mockResolvedValueOnce([updatedLabel])

      const result = await labelService.update(adminUser, 1, { color: '#cc0000' })
      expect(result).toEqual(updatedLabel)
    })

    it('throws NotFoundError when label does not exist', async () => {
      const { labelService } = await import('../label.service')
      mockFindFirst.mockResolvedValueOnce(undefined)

      await expect(labelService.update(adminUser, 999, { color: '#cc0000' })).rejects.toThrow(
        'Label not found'
      )
    })

    it('throws ForbiddenError for customer user', async () => {
      const { labelService } = await import('../label.service')
      await expect(labelService.update(customerUser, 1, { color: '#cc0000' })).rejects.toThrow(
        'Only staff can manage labels'
      )
    })

    it('checks name uniqueness when name is changed', async () => {
      const { labelService } = await import('../label.service')
      const existingLabel = {
        id: 1,
        name: 'Bug',
        color: '#ff0000',
        description: null,
        createdBy: 'user-1',
        createdAt: new Date(),
      }

      // getById returns the label
      mockFindFirst.mockResolvedValueOnce(existingLabel)
      // uniqueness check returns a conflict
      mockFindFirst.mockResolvedValueOnce({ id: 2, name: 'Feature' })

      await expect(labelService.update(adminUser, 1, { name: 'Feature' })).rejects.toThrow(
        'A label with this name already exists'
      )
    })
  })

  describe('delete', () => {
    it('deletes a label for admin user', async () => {
      const { labelService } = await import('../label.service')
      mockFindFirst.mockResolvedValueOnce({
        id: 1,
        name: 'Bug',
        color: '#ff0000',
      })
      mockDelete.mockResolvedValueOnce(undefined)

      const result = await labelService.delete(adminUser, 1)
      expect(result).toEqual({ success: true })
    })

    it('throws NotFoundError when label does not exist', async () => {
      const { labelService } = await import('../label.service')
      mockFindFirst.mockResolvedValueOnce(undefined)

      await expect(labelService.delete(adminUser, 999)).rejects.toThrow('Label not found')
    })

    it('throws ForbiddenError for non-admin user', async () => {
      const { labelService } = await import('../label.service')
      await expect(labelService.delete(agentUser, 1)).rejects.toThrow(
        'Only admins can delete labels'
      )
    })

    it('throws ForbiddenError for customer user', async () => {
      const { labelService } = await import('../label.service')
      await expect(labelService.delete(customerUser, 1)).rejects.toThrow(
        'Only admins can delete labels'
      )
    })
  })

  describe('addToIssue', () => {
    it('adds a label to an issue for staff user', async () => {
      const { labelService } = await import('../label.service')
      const mockIssue = {
        id: 1,
        issueKey: 'PROJ-1',
        projectId: 1,
        reporterId: 'user-1',
        isPrivate: false,
      }

      // getById (label)
      mockFindFirst.mockResolvedValueOnce({ id: 1, name: 'Bug', color: '#ff0000' })
      // findFirst (issue)
      mockFindFirst.mockResolvedValueOnce(mockIssue)
      // issueLabels findFirst (not existing)
      mockIssueLabelsFindFirst.mockResolvedValueOnce(undefined)
      // insert
      mockReturning.mockResolvedValueOnce([{}])

      const result = await labelService.addToIssue(adminUser, 'PROJ-1', 1)
      expect(result).toEqual({ success: true })
    })

    it('throws ForbiddenError for customer user', async () => {
      const { labelService } = await import('../label.service')
      await expect(labelService.addToIssue(customerUser, 'PROJ-1', 1)).rejects.toThrow(
        'Only staff can manage labels'
      )
    })
  })

  describe('removeFromIssue', () => {
    it('removes a label from an issue for staff user', async () => {
      const { labelService } = await import('../label.service')
      const mockIssue = {
        id: 1,
        issueKey: 'PROJ-1',
        projectId: 1,
        reporterId: 'user-1',
        isPrivate: false,
      }

      // findFirst (issue)
      mockFindFirst.mockResolvedValueOnce(mockIssue)
      // delete
      mockDelete.mockResolvedValueOnce(undefined)

      const result = await labelService.removeFromIssue(adminUser, 'PROJ-1', 1)
      expect(result).toEqual({ success: true })
    })

    it('throws ForbiddenError for customer user', async () => {
      const { labelService } = await import('../label.service')
      await expect(labelService.removeFromIssue(customerUser, 'PROJ-1', 1)).rejects.toThrow(
        'Only staff can manage labels'
      )
    })
  })
})

// ============================================
// Schema validation tests
// ============================================

describe('createLabelSchema', () => {
  it('validates valid input', async () => {
    const { createLabelSchema } = await import('../label.service')
    const result = createLabelSchema.safeParse({
      name: 'Bug',
      color: '#ff0000',
      description: 'Bug reports',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', async () => {
    const { createLabelSchema } = await import('../label.service')
    const result = createLabelSchema.safeParse({
      name: '',
      color: '#ff0000',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid hex color', async () => {
    const { createLabelSchema } = await import('../label.service')
    const result = createLabelSchema.safeParse({
      name: 'Bug',
      color: 'red',
    })
    expect(result.success).toBe(false)
  })

  it('rejects name over 50 characters', async () => {
    const { createLabelSchema } = await import('../label.service')
    const result = createLabelSchema.safeParse({
      name: 'a'.repeat(51),
      color: '#ff0000',
    })
    expect(result.success).toBe(false)
  })

  it('allows missing description', async () => {
    const { createLabelSchema } = await import('../label.service')
    const result = createLabelSchema.safeParse({
      name: 'Bug',
      color: '#ff0000',
    })
    expect(result.success).toBe(true)
  })
})

describe('updateLabelSchema', () => {
  it('allows partial updates', async () => {
    const { updateLabelSchema } = await import('../label.service')
    const result = updateLabelSchema.safeParse({ color: '#00ff00' })
    expect(result.success).toBe(true)
  })

  it('allows nullable description', async () => {
    const { updateLabelSchema } = await import('../label.service')
    const result = updateLabelSchema.safeParse({ description: null })
    expect(result.success).toBe(true)
  })

  it('allows empty object', async () => {
    const { updateLabelSchema } = await import('../label.service')
    const result = updateLabelSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

// ============================================
// Export test
// ============================================

describe('labelService export', () => {
  it('exports labelService singleton', async () => {
    const { labelService } = await import('../label.service')
    expect(labelService).toBeDefined()
    expect(typeof labelService.list).toBe('function')
    expect(typeof labelService.getById).toBe('function')
    expect(typeof labelService.create).toBe('function')
    expect(typeof labelService.update).toBe('function')
    expect(typeof labelService.delete).toBe('function')
    expect(typeof labelService.addToIssue).toBe('function')
    expect(typeof labelService.removeFromIssue).toBe('function')
  })
})
