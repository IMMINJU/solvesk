import type { AuthenticatedUser } from '@/lib/permissions'

/**
 * Anyone can delete their own upload; admins can delete any. Pure guard so the
 * rule can be tested without mocking the DB — deleteById delegates here after
 * loading the attachment.
 */
export function canDeleteAttachment(
  user: AuthenticatedUser,
  attachment: { uploadedBy: string }
): boolean {
  return user.role === 'admin' || attachment.uploadedBy === user.id
}
