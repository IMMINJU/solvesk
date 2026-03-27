import type { AuthenticatedUser } from '@/lib/permissions'

export function canManageLabel(user: AuthenticatedUser): boolean {
  return user.role === 'admin' || user.role === 'agent'
}

export function canDeleteLabel(user: AuthenticatedUser): boolean {
  return user.role === 'admin'
}
