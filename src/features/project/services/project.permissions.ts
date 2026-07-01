import type { AuthenticatedUser } from '@/lib/permissions'

/**
 * Creating, updating and deleting projects is admin-only.
 */
export function canManageProjects(user: AuthenticatedUser): boolean {
  return user.role === 'admin'
}

/**
 * Read access to a single project. Admins see everything; a customer is bound to
 * their own `projectId`; an agent needs an assignment on this project.
 *
 * Membership is passed in (`isMember`) rather than queried here so the rule stays
 * a pure function — the service loads the agent's membership and hands it over.
 */
export function canAccessProject(
  user: AuthenticatedUser,
  projectId: number,
  ctx: { isMember: boolean }
): boolean {
  if (user.role === 'admin') return true
  if (user.role === 'customer') return user.projectId === projectId
  return ctx.isMember
}
