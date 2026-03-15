import { describe, it, expect } from 'vitest'
import {
  PERMISSIONS,
  hasPermission,
  canAccessResource,
  isAdmin,
  isStaff,
  CUSTOMER_CONSTRAINTS,
  canCustomerChangeStatus,
} from '../permissions-config'

describe('PERMISSIONS structure', () => {
  it('has exactly 6 resources', () => {
    const resources = Object.keys(PERMISSIONS)
    expect(resources).toEqual(['dashboard', 'users', 'issues', 'projects', 'labels', 'comments'])
  })

  it("no resource grants any action to 'developer' role", () => {
    for (const [, actions] of Object.entries(PERMISSIONS)) {
      for (const [, roles] of Object.entries(actions)) {
        expect(roles).not.toContain('developer')
      }
    }
  })
})

describe('hasPermission', () => {
  it('admin can do everything', () => {
    expect(hasPermission('admin', 'users', 'create')).toBe(true)
    expect(hasPermission('admin', 'issues', 'delete')).toBe(true)
    expect(hasPermission('admin', 'projects', 'assignMembers')).toBe(true)
    expect(hasPermission('admin', 'dashboard', 'view')).toBe(true)
  })

  it('agent can view/create/update issues but not delete', () => {
    expect(hasPermission('agent', 'issues', 'view')).toBe(true)
    expect(hasPermission('agent', 'issues', 'create')).toBe(true)
    expect(hasPermission('agent', 'issues', 'update')).toBe(true)
    expect(hasPermission('agent', 'issues', 'delete')).toBe(false)
  })

  it('customer can view/create issues but not update/delete', () => {
    expect(hasPermission('customer', 'issues', 'view')).toBe(true)
    expect(hasPermission('customer', 'issues', 'create')).toBe(true)
    expect(hasPermission('customer', 'issues', 'update')).toBe(false)
    expect(hasPermission('customer', 'issues', 'delete')).toBe(false)
  })

  it('customer can updateOwn issues', () => {
    expect(hasPermission('customer', 'issues', 'updateOwn')).toBe(true)
  })

  it('customer cannot view dashboard', () => {
    expect(hasPermission('customer', 'dashboard', 'view')).toBe(false)
  })

  it('customer cannot manage users', () => {
    expect(hasPermission('customer', 'users', 'view')).toBe(false)
    expect(hasPermission('customer', 'users', 'create')).toBe(false)
  })

  it('returns false for null/undefined role', () => {
    expect(hasPermission(null, 'issues', 'view')).toBe(false)
    expect(hasPermission(undefined, 'issues', 'view')).toBe(false)
  })

  it('returns false for unknown role', () => {
    expect(hasPermission('superadmin', 'issues', 'view')).toBe(false)
  })

  it('agent cannot assign project members', () => {
    expect(hasPermission('agent', 'projects', 'assignMembers')).toBe(false)
  })

  it('customer cannot create labels', () => {
    expect(hasPermission('customer', 'labels', 'create')).toBe(false)
  })
})

describe('canAccessResource', () => {
  it('admin can access all resources', () => {
    expect(canAccessResource('admin', 'dashboard')).toBe(true)
    expect(canAccessResource('admin', 'users')).toBe(true)
    expect(canAccessResource('admin', 'issues')).toBe(true)
  })

  it('customer can access issues, projects, labels, comments', () => {
    expect(canAccessResource('customer', 'issues')).toBe(true)
    expect(canAccessResource('customer', 'projects')).toBe(true)
    expect(canAccessResource('customer', 'labels')).toBe(true)
    expect(canAccessResource('customer', 'comments')).toBe(true)
  })

  it('customer cannot access dashboard or users', () => {
    expect(canAccessResource('customer', 'dashboard')).toBe(false)
    expect(canAccessResource('customer', 'users')).toBe(false)
  })

  it('returns false for null role', () => {
    expect(canAccessResource(null, 'issues')).toBe(false)
  })
})

describe('isAdmin / isStaff', () => {
  it('isAdmin is true only for admin', () => {
    expect(isAdmin('admin')).toBe(true)
    expect(isAdmin('agent')).toBe(false)
    expect(isAdmin('customer')).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })

  it('isStaff includes admin and agent', () => {
    expect(isStaff('admin')).toBe(true)
    expect(isStaff('agent')).toBe(true)
    expect(isStaff('customer')).toBe(false)
    expect(isStaff(null)).toBe(false)
  })
})

describe('CUSTOMER_CONSTRAINTS', () => {
  it('allows only resolved status change', () => {
    expect(CUSTOMER_CONSTRAINTS.issues.allowedStatusChanges).toEqual(['resolved'])
  })

  it('denies assign/priority/dueDate', () => {
    expect(CUSTOMER_CONSTRAINTS.issues.canAssignUsers).toBe(false)
    expect(CUSTOMER_CONSTRAINTS.issues.canChangePriority).toBe(false)
    expect(CUSTOMER_CONSTRAINTS.issues.canSetDueDate).toBe(false)
  })

  it('denies internal comments', () => {
    expect(CUSTOMER_CONSTRAINTS.comments.canCreateInternalComments).toBe(false)
  })

  it('denies cross-project access', () => {
    expect(CUSTOMER_CONSTRAINTS.projects.canViewOtherProjects).toBe(false)
    expect(CUSTOMER_CONSTRAINTS.projects.canCreateIssueInOtherProjects).toBe(false)
  })
})

describe('canCustomerChangeStatus', () => {
  it('allows resolved', () => {
    expect(canCustomerChangeStatus('resolved')).toBe(true)
  })

  it('denies other statuses', () => {
    expect(canCustomerChangeStatus('open')).toBe(false)
    expect(canCustomerChangeStatus('in_progress')).toBe(false)
    expect(canCustomerChangeStatus('waiting')).toBe(false)
    expect(canCustomerChangeStatus('closed')).toBe(false)
  })
})
