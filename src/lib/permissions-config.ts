/**
 * Centralized permissions configuration
 * Safe to import in client components
 */

export type UserRole = 'admin' | 'agent' | 'customer'

export const PERMISSIONS = {
  dashboard: {
    view: ['admin', 'agent'],
  },
  users: {
    view: ['admin'],
    create: ['admin'],
    update: ['admin'],
    delete: ['admin'],
  },
  issues: {
    view: ['admin', 'agent', 'customer'],
    create: ['admin', 'agent', 'customer'],
    update: ['admin', 'agent'],
    updateOwn: ['admin', 'agent', 'customer'],
    updateStatus: ['admin', 'agent'],
    updatePriority: ['admin', 'agent'],
    updateDueDate: ['admin', 'agent'],
    updateAssignee: ['admin', 'agent'],
    delete: ['admin'],
    viewPrivate: ['admin', 'agent'],
  },
  projects: {
    view: ['admin', 'agent', 'customer'],
    create: ['admin'],
    update: ['admin'],
    delete: ['admin'],
    assignMembers: ['admin'],
  },
  labels: {
    view: ['admin', 'agent', 'customer'],
    create: ['admin'],
    update: ['admin'],
    delete: ['admin'],
  },
  comments: {
    view: ['admin', 'agent', 'customer'],
    create: ['admin', 'agent', 'customer'],
    updateOwn: ['admin', 'agent', 'customer'],
    delete: ['admin'],
    deleteOwn: ['admin', 'agent', 'customer'],
  },
} as const

export type Resource = keyof typeof PERMISSIONS
export type ValidAction<R extends Resource> = Extract<keyof (typeof PERMISSIONS)[R], string>

/**
 * Check if a role has permission for a specific action
 */
export function hasPermission<R extends Resource>(
  userRole: UserRole | string | undefined | null,
  resource: R,
  action: ValidAction<R>
): boolean {
  if (!userRole) return false
  const permission = PERMISSIONS[resource]
  if (!permission) return false
  const allowedRoles = permission[action as keyof typeof permission]
  if (!allowedRoles) return false
  return (allowedRoles as readonly string[]).includes(userRole)
}

/**
 * Check if user can perform any action on a resource
 */
export function canAccessResource(
  userRole: UserRole | string | undefined | null,
  resource: Resource
): boolean {
  if (!userRole) return false
  const permission = PERMISSIONS[resource]
  if (!permission) return false
  return Object.values(permission).some(allowedRoles =>
    (allowedRoles as readonly string[]).includes(userRole)
  )
}

export function isAdmin(role: UserRole | string | undefined | null): role is 'admin' {
  return role === 'admin'
}

export function isStaff(role: UserRole | string | undefined | null): boolean {
  return role === 'admin' || role === 'agent'
}

export const CUSTOMER_CONSTRAINTS = {
  issues: {
    allowedStatusChanges: ['resolved'] as const,
    canAssignUsers: false,
    canChangePriority: false,
    canSetDueDate: false,
  },
  comments: {
    canCreateInternalComments: false,
  },
  projects: {
    canViewOtherProjects: false,
    canCreateIssueInOtherProjects: false,
  },
} as const

export function canCustomerChangeStatus(targetStatus: string): boolean {
  return (CUSTOMER_CONSTRAINTS.issues.allowedStatusChanges as readonly string[]).includes(
    targetStatus
  )
}
