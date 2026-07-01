import { describe, it, expect } from 'vitest'
import { createProjectSchema, updateProjectSchema } from '../project.service'
import { canManageProjects, canAccessProject } from '../project.permissions'
import type { AuthenticatedUser } from '@/lib/permissions'

describe('createProjectSchema', () => {
  it('accepts valid input', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test Project',
      code: 'PROJ',
      description: 'A test project',
    })
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = createProjectSchema.safeParse({
      name: '',
      code: 'PROJ',
    })
    expect(result.success).toBe(false)
  })

  it('requires code to start with uppercase letter', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      code: '1PROJ',
    })
    expect(result.success).toBe(false)
  })

  it('rejects lowercase code', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      code: 'proj',
    })
    expect(result.success).toBe(false)
  })

  it('accepts code with numbers and underscores', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      code: 'PROJ_01',
    })
    expect(result.success).toBe(true)
  })

  it('rejects code longer than 10 chars', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      code: 'ABCDEFGHIJK',
    })
    expect(result.success).toBe(false)
  })

  it('rejects code shorter than 2 chars', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      code: 'A',
    })
    expect(result.success).toBe(false)
  })

  it('description is optional', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      code: 'AB',
    })
    expect(result.success).toBe(true)
  })

  it('rejects description over 1000 chars', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      code: 'AB',
      description: 'x'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})

describe('updateProjectSchema', () => {
  it('accepts partial update', () => {
    const result = updateProjectSchema.safeParse({ name: 'Updated' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateProjectSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts null description', () => {
    const result = updateProjectSchema.safeParse({ description: null })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = updateProjectSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })
})

// ============================================
// Permission logic (pure, no mocks)
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

describe('canManageProjects', () => {
  it('allows only admin to create/update/delete projects', () => {
    expect(canManageProjects(adminUser)).toBe(true)
    expect(canManageProjects(agentUser)).toBe(false)
    expect(canManageProjects(customerUser)).toBe(false)
  })
})

describe('canAccessProject', () => {
  it('lets admin access any project', () => {
    expect(canAccessProject(adminUser, 999, { isMember: false })).toBe(true)
  })

  it('lets a customer access only their own project', () => {
    expect(canAccessProject(customerUser, 1, { isMember: false })).toBe(true)
    expect(canAccessProject(customerUser, 2, { isMember: false })).toBe(false)
  })

  it('lets an agent access a project only when assigned', () => {
    expect(canAccessProject(agentUser, 1, { isMember: true })).toBe(true)
    expect(canAccessProject(agentUser, 1, { isMember: false })).toBe(false)
  })
})
