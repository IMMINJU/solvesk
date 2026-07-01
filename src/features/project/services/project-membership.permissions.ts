import type { AuthenticatedUser } from '@/lib/permissions'

/**
 * Only admins manage project membership (list/add/remove agents, list available
 * agents). Kept as a pure guard so it can be tested without a DB — the service
 * delegates here instead of inlining the role check.
 */
export function canManageProjectMembers(user: AuthenticatedUser): boolean {
  return user.role === 'admin'
}
