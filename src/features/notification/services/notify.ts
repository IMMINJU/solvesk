/**
 * Notification creation — called from issue/comment services
 * after successful mutations.
 *
 * Runs fire-and-forget (errors are logged, not thrown)
 * to avoid blocking the main operation.
 */
import { db, notifications, projectMembers, users } from '@/db'
import { eq, and, ne, inArray } from 'drizzle-orm'
import { APP_CONFIG } from '@/config/app'
import { buildPseudonymMap } from '@/lib/utils/pseudonym'

type NotificationType =
  | 'issue_created'
  | 'issue_assigned'
  | 'issue_status_changed'
  | 'issue_priority_changed'
  | 'comment_added'
  | 'issue_mentioned'

interface NotifyParams {
  type: NotificationType
  issueId: number
  issueKey: string
  /** User who triggered the action (excluded from recipients) */
  actorId: string
  actorName: string
}

/**
 * Build message text for a notification.
 * For customer recipients, staff names are replaced with pseudonyms.
 */
export function buildNotificationMessage(
  type: NotificationType,
  issueKey: string,
  actorName: string
): string {
  switch (type) {
    case 'issue_created':
      return `${actorName} created ${issueKey}`
    case 'issue_assigned':
      return `${actorName} assigned you to ${issueKey}`
    case 'issue_status_changed':
      return `${actorName} changed the status of ${issueKey}`
    case 'issue_priority_changed':
      return `${actorName} changed the priority of ${issueKey}`
    case 'comment_added':
      return `${actorName} commented on ${issueKey}`
    case 'issue_mentioned':
      return `${actorName} mentioned you in ${issueKey}`
    default:
      return `${actorName} updated ${issueKey}`
  }
}

/**
 * Get the display name for a notification recipient.
 * If the recipient is a customer and pseudonym is enabled,
 * the actor's name is masked.
 */
function getActorNameForRecipient(
  recipientRole: string,
  actorId: string,
  actorName: string
): string {
  if (recipientRole === 'customer' && APP_CONFIG.pseudonym.enabled) {
    const map = buildPseudonymMap([actorId])
    return map.get(actorId) ?? actorName
  }
  return actorName
}

/**
 * Insert notifications for a list of recipients.
 * Excludes the actor and deduplicates.
 */
async function insertNotifications(
  recipientIds: Array<{ userId: string; role: string }>,
  params: NotifyParams
): Promise<void> {
  const uniqueRecipients = recipientIds.filter(
    (r, i, arr) => r.userId !== params.actorId && arr.findIndex(x => x.userId === r.userId) === i
  )

  if (uniqueRecipients.length === 0) return

  const values = uniqueRecipients.map(r => ({
    userId: r.userId,
    type: params.type,
    issueId: params.issueId,
    message: buildNotificationMessage(
      params.type,
      params.issueKey,
      getActorNameForRecipient(r.role, params.actorId, params.actorName)
    ),
  }))

  await db.insert(notifications).values(values)
}

/**
 * Notify project agents + admins when an issue is created.
 */
export async function notifyIssueCreated(
  params: NotifyParams & { projectId: number }
): Promise<void> {
  try {
    const recipients = await getProjectStaff(params.projectId, params.actorId)
    await insertNotifications(recipients, params)
  } catch (err) {
    console.error('Failed to send issue_created notifications:', err)
  }
}

/**
 * Notify the assignee when assigned to an issue.
 */
export async function notifyIssueAssigned(
  params: NotifyParams & { assigneeId: string }
): Promise<void> {
  try {
    if (params.assigneeId === params.actorId) return

    const user = await db.query.users.findFirst({
      where: eq(users.id, params.assigneeId),
      columns: { id: true, role: true },
    })
    if (!user) return

    await insertNotifications([{ userId: user.id, role: user.role }], params)
  } catch (err) {
    console.error('Failed to send issue_assigned notification:', err)
  }
}

/**
 * Notify the reporter when issue status changes.
 */
export async function notifyStatusChanged(
  params: NotifyParams & { reporterId: string }
): Promise<void> {
  try {
    if (params.reporterId === params.actorId) return

    const user = await db.query.users.findFirst({
      where: eq(users.id, params.reporterId),
      columns: { id: true, role: true },
    })
    if (!user) return

    await insertNotifications([{ userId: user.id, role: user.role }], params)
  } catch (err) {
    console.error('Failed to send status_changed notification:', err)
  }
}

/**
 * Notify reporter + assignee when a comment is added.
 * Internal comments only notify staff.
 */
export async function notifyCommentAdded(
  params: NotifyParams & {
    reporterId: string
    assigneeId: string | null
    isInternal: boolean
  }
): Promise<void> {
  try {
    const targetIds = new Set<string>()
    if (params.reporterId !== params.actorId && !params.isInternal) {
      targetIds.add(params.reporterId)
    }
    if (params.assigneeId && params.assigneeId !== params.actorId) {
      targetIds.add(params.assigneeId)
    }

    if (targetIds.size === 0) return

    const targetUsers = await db.query.users.findMany({
      where: inArray(users.id, [...targetIds]),
      columns: { id: true, role: true },
    })

    // For internal comments, only notify staff
    const recipients = params.isInternal
      ? targetUsers.filter(u => u.role !== 'customer')
      : targetUsers

    await insertNotifications(
      recipients.map(u => ({ userId: u.id, role: u.role })),
      params
    )
  } catch (err) {
    console.error('Failed to send comment_added notifications:', err)
  }
}

/**
 * Notify the reporter when issue priority changes.
 */
export async function notifyPriorityChanged(
  params: NotifyParams & { reporterId: string }
): Promise<void> {
  try {
    if (params.reporterId === params.actorId) return

    const user = await db.query.users.findFirst({
      where: eq(users.id, params.reporterId),
      columns: { id: true, role: true },
    })
    if (!user) return

    await insertNotifications([{ userId: user.id, role: user.role }], params)
  } catch (err) {
    console.error('Failed to send priority_changed notification:', err)
  }
}

/**
 * Get all staff (agents + admins) for a project, excluding actor.
 */
async function getProjectStaff(
  projectId: number,
  excludeUserId: string
): Promise<Array<{ userId: string; role: string }>> {
  // Project agents
  const members = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId))

  // Admins
  const admins = await db.query.users.findMany({
    where: eq(users.role, 'admin'),
    columns: { id: true, role: true },
  })

  const agentIds = members.map(m => m.userId)
  let agents: Array<{ id: string; role: string }> = []
  if (agentIds.length > 0) {
    agents = await db.query.users.findMany({
      where: inArray(users.id, agentIds),
      columns: { id: true, role: true },
    })
  }

  const all = [
    ...admins.map(u => ({ userId: u.id, role: u.role })),
    ...agents.map(u => ({ userId: u.id, role: u.role })),
  ]

  return all.filter(
    (r, i, arr) => r.userId !== excludeUserId && arr.findIndex(x => x.userId === r.userId) === i
  )
}
