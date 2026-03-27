import type { AuthenticatedUser } from '@/lib/permissions'

export function canCreateInternalComment(user: AuthenticatedUser): boolean {
  return user.role !== 'customer'
}

export function canUpdateComment(
  user: AuthenticatedUser,
  comment: { authorId: string }
): boolean {
  return comment.authorId === user.id
}

export function canDeleteComment(
  user: AuthenticatedUser,
  comment: { authorId: string }
): boolean {
  return user.role === 'admin' || comment.authorId === user.id
}
