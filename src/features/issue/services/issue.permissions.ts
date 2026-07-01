import type { AuthenticatedUser } from '@/lib/permissions'

/**
 * Fields a customer is not allowed to set when creating an issue are forced to
 * safe defaults, regardless of what the client sent: no self-assignment, fixed
 * priority, no due date. Staff keep whatever they passed.
 *
 * Pure so the constraint can be tested without touching the DB — create()
 * applies the returned values (converting dueDate to a Date itself).
 */
export function resolveCustomerIssueFields(
  user: AuthenticatedUser,
  input: {
    assigneeId?: string | null
    priority?: 'urgent' | 'high' | 'medium' | 'low'
    dueDate?: string | null
  }
): {
  assigneeId: string | null
  priority: 'urgent' | 'high' | 'medium' | 'low'
  dueDate: string | null
} {
  if (user.role === 'customer') {
    return { assigneeId: null, priority: 'medium', dueDate: null }
  }
  return {
    assigneeId: input.assigneeId ?? null,
    priority: input.priority ?? 'medium',
    dueDate: input.dueDate ?? null,
  }
}

/**
 * Customers may only edit issues they reported.
 */
export function canEditIssue(user: AuthenticatedUser, issue: { reporterId: string }): boolean {
  if (user.role !== 'customer') return true
  return issue.reporterId === user.id
}

/**
 * Assigning and (re)prioritising an issue are staff-only — customers can do
 * neither. Deleting an issue is admin-only.
 */
export function canAssignIssue(user: AuthenticatedUser): boolean {
  return user.role !== 'customer'
}

export function canChangeIssuePriority(user: AuthenticatedUser): boolean {
  return user.role !== 'customer'
}

export function canDeleteIssue(user: AuthenticatedUser): boolean {
  return user.role === 'admin'
}

/**
 * Whether a user may open a new issue in a given project. Same shape as
 * project access: admins anywhere, a customer only in their own project, an
 * agent only where assigned. Membership is passed in so this stays pure — the
 * service loads the agent's membership and hands over `isMember`.
 */
export function canCreateIssueInProject(
  user: AuthenticatedUser,
  projectId: number,
  ctx: { isMember: boolean }
): boolean {
  if (user.role === 'admin') return true
  if (user.role === 'customer') return user.projectId === projectId
  return ctx.isMember
}
