import { db, auditLogs } from '@/db'

export type ResourceType = 'issue' | 'comment' | 'project' | 'user' | 'label'

/**
 * Log an audit event (sensitive operations only)
 */
export async function logAudit(
  userId: string | null,
  action: string,
  resourceType: ResourceType,
  resourceId: string,
  changes?: Record<string, { before?: unknown; after?: unknown }>
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId,
      action,
      resourceType,
      resourceId,
      changes,
    })
  } catch {
    // Audit logging should never break the main operation
    console.error('[audit-logger] Failed to write audit log')
  }
}
