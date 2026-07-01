import { describe, it, expect } from 'vitest'
import { canManageProjectMembers } from '../project-membership.permissions'
import type { AuthenticatedUser } from '@/lib/permissions'

/**
 * ProjectMembershipService is DB-heavy (every method queries project_members +
 * users), so full CRUD is covered in E2E (tests/e2e/project-members.spec.ts).
 * The one piece of pure logic — the admin-only guard shared by listMembers,
 * addMember, removeMember and getAvailableAgents — lives in
 * project-membership.permissions.ts and is tested here with no mocks.
 */

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

describe('canManageProjectMembers', () => {
  it('allows admin to manage members', () => {
    expect(canManageProjectMembers(adminUser)).toBe(true)
  })

  it('rejects agent from managing members', () => {
    expect(canManageProjectMembers(agentUser)).toBe(false)
  })

  it('rejects customer from managing members', () => {
    expect(canManageProjectMembers(customerUser)).toBe(false)
  })
})
