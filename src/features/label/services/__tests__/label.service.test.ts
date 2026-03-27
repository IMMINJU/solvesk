import { describe, it, expect } from 'vitest'
import type { LabelListItem, LabelListResult } from '../label.service'
import { createLabelSchema, updateLabelSchema } from '../label.service'
import { canManageLabel, canDeleteLabel } from '../label.permissions'
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
    const result: LabelListResult = { data: [], total: 0, page: 1, pageSize: 20 }
    expect(result.total).toBe(0)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(20)
  })

  it('contains LabelListItem array in data', () => {
    const result: LabelListResult = {
      data: [{ id: 1, name: 'Bug', color: '#ff0000', description: null, createdBy: 'user-1', createdAt: new Date() }],
      total: 1,
      page: 1,
      pageSize: 20,
    }
    expect(result.data).toHaveLength(1)
    expect(result.data[0].name).toBe('Bug')
  })
})

// ============================================
// Permission tests (pure functions, no mocks)
// ============================================

describe('canManageLabel', () => {
  it('allows admin to manage labels', () => {
    expect(canManageLabel(adminUser)).toBe(true)
  })

  it('allows agent to manage labels', () => {
    expect(canManageLabel(agentUser)).toBe(true)
  })

  it('rejects customer from managing labels', () => {
    expect(canManageLabel(customerUser)).toBe(false)
  })
})

describe('canDeleteLabel', () => {
  it('allows admin to delete labels', () => {
    expect(canDeleteLabel(adminUser)).toBe(true)
  })

  it('rejects agent from deleting labels', () => {
    expect(canDeleteLabel(agentUser)).toBe(false)
  })

  it('rejects customer from deleting labels', () => {
    expect(canDeleteLabel(customerUser)).toBe(false)
  })
})

// ============================================
// Schema tests
// ============================================

describe('createLabelSchema', () => {
  it('validates valid input', () => {
    const result = createLabelSchema.safeParse({ name: 'Bug', color: '#ff0000', description: 'Bug reports' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createLabelSchema.safeParse({ name: '', color: '#ff0000' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid hex color', () => {
    const result = createLabelSchema.safeParse({ name: 'Bug', color: 'red' })
    expect(result.success).toBe(false)
  })

  it('rejects name over 50 characters', () => {
    const result = createLabelSchema.safeParse({ name: 'a'.repeat(51), color: '#ff0000' })
    expect(result.success).toBe(false)
  })

  it('allows missing description', () => {
    const result = createLabelSchema.safeParse({ name: 'Bug', color: '#ff0000' })
    expect(result.success).toBe(true)
  })
})

describe('updateLabelSchema', () => {
  it('allows partial updates', () => {
    const result = updateLabelSchema.safeParse({ color: '#00ff00' })
    expect(result.success).toBe(true)
  })

  it('allows nullable description', () => {
    const result = updateLabelSchema.safeParse({ description: null })
    expect(result.success).toBe(true)
  })

  it('allows empty object', () => {
    const result = updateLabelSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})
