/**
 * Integration: Notification triggers
 *
 * Verifies that the correct notifications are created for each event,
 * sent to the right recipients, with proper pseudonym handling.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { db, notifications } from '@/db'
import { eq, and } from 'drizzle-orm'
import { cleanDatabase } from './setup'
import { createTestWorld, createIssue, type TestWorld } from './fixtures'
import {
  notifyIssueCreated,
  notifyIssueAssigned,
  notifyStatusChanged,
  notifyPriorityChanged,
  notifyCommentAdded,
} from '@/features/notification/services/notify'

let world: TestWorld

beforeAll(async () => {
  await cleanDatabase()
  world = await createTestWorld()
})

// ── Helper ───────────────────────────────────────────────

async function getNotifications(userId: string) {
  return db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
  })
}

async function clearNotifications() {
  await db.delete(notifications)
}

// ── 1. Issue Created ─────────────────────────────────────

describe('notifyIssueCreated', () => {
  it('notifies project staff (admins + assigned agents), excludes actor', async () => {
    await clearNotifications()
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })

    await notifyIssueCreated({
      type: 'issue_created',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: world.customer1.id,
      actorName: world.customer1.name!,
      projectId: world.projectA.id,
    })

    // admin, agent1, agent2 are staff for projectA
    const adminNotifs = await getNotifications(world.admin.id)
    const agent1Notifs = await getNotifications(world.agent1.id)
    const agent2Notifs = await getNotifications(world.agent2.id)
    const customer1Notifs = await getNotifications(world.customer1.id)

    expect(adminNotifs).toHaveLength(1)
    expect(adminNotifs[0].type).toBe('issue_created')
    expect(adminNotifs[0].issueId).toBe(issue.id)

    expect(agent1Notifs).toHaveLength(1)
    expect(agent2Notifs).toHaveLength(1)

    // Actor (customer1) should NOT get a notification
    expect(customer1Notifs).toHaveLength(0)
  })

  it('excludes actor when actor is staff', async () => {
    await clearNotifications()
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.agent1.id,
    })

    await notifyIssueCreated({
      type: 'issue_created',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: world.agent1.id,
      actorName: world.agent1.name!,
      projectId: world.projectA.id,
    })

    // agent1 is actor → excluded
    const agent1Notifs = await getNotifications(world.agent1.id)
    expect(agent1Notifs).toHaveLength(0)

    // admin and agent2 should receive
    const adminNotifs = await getNotifications(world.admin.id)
    const agent2Notifs = await getNotifications(world.agent2.id)
    expect(adminNotifs).toHaveLength(1)
    expect(agent2Notifs).toHaveLength(1)
  })

  it('does not notify agents from other projects', async () => {
    await clearNotifications()
    const issue = await createIssue({
      projectId: world.projectB.id,
      reporterId: world.customer2.id,
    })

    await notifyIssueCreated({
      type: 'issue_created',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: world.customer2.id,
      actorName: world.customer2.name!,
      projectId: world.projectB.id,
    })

    // agent2 is NOT assigned to projectB
    const agent2Notifs = await getNotifications(world.agent2.id)
    expect(agent2Notifs).toHaveLength(0)

    // agent1 IS assigned to projectB
    const agent1Notifs = await getNotifications(world.agent1.id)
    expect(agent1Notifs).toHaveLength(1)
  })

  it('message contains issueKey and actor name', async () => {
    await clearNotifications()
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })

    await notifyIssueCreated({
      type: 'issue_created',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: world.customer1.id,
      actorName: 'Charlie Customer',
      projectId: world.projectA.id,
    })

    const notifs = await getNotifications(world.admin.id)
    expect(notifs[0].message).toContain(issue.issueKey)
    expect(notifs[0].message).toContain('Charlie Customer')
  })
})

// ── 2. Issue Assigned ────────────────────────────────────

describe('notifyIssueAssigned', () => {
  it('notifies the assignee', async () => {
    await clearNotifications()
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })

    await notifyIssueAssigned({
      type: 'issue_assigned',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: world.admin.id,
      actorName: world.admin.name!,
      assigneeId: world.agent1.id,
    })

    const notifs = await getNotifications(world.agent1.id)
    expect(notifs).toHaveLength(1)
    expect(notifs[0].type).toBe('issue_assigned')
    expect(notifs[0].message).toContain('assigned you')
  })

  it('does not notify when assigning to self', async () => {
    await clearNotifications()
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })

    await notifyIssueAssigned({
      type: 'issue_assigned',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: world.agent1.id,
      actorName: world.agent1.name!,
      assigneeId: world.agent1.id,
    })

    const notifs = await getNotifications(world.agent1.id)
    expect(notifs).toHaveLength(0)
  })
})

// ── 3. Status Changed ───────────────────────────────────

describe('notifyStatusChanged', () => {
  it('notifies the reporter', async () => {
    await clearNotifications()
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })

    await notifyStatusChanged({
      type: 'issue_status_changed',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: world.agent1.id,
      actorName: world.agent1.name!,
      reporterId: world.customer1.id,
    })

    const notifs = await getNotifications(world.customer1.id)
    expect(notifs).toHaveLength(1)
    expect(notifs[0].type).toBe('issue_status_changed')
    expect(notifs[0].message).toContain('changed the status')
  })

  it('does not notify when reporter is the actor', async () => {
    await clearNotifications()
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })

    await notifyStatusChanged({
      type: 'issue_status_changed',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: world.customer1.id,
      actorName: world.customer1.name!,
      reporterId: world.customer1.id,
    })

    const notifs = await getNotifications(world.customer1.id)
    expect(notifs).toHaveLength(0)
  })
})

// ── 4. Priority Changed ─────────────────────────────────

describe('notifyPriorityChanged', () => {
  it('notifies the reporter', async () => {
    await clearNotifications()
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })

    await notifyPriorityChanged({
      type: 'issue_priority_changed',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: world.agent1.id,
      actorName: world.agent1.name!,
      reporterId: world.customer1.id,
    })

    const notifs = await getNotifications(world.customer1.id)
    expect(notifs).toHaveLength(1)
    expect(notifs[0].type).toBe('issue_priority_changed')
    expect(notifs[0].message).toContain('changed the priority')
  })
})

// ── 5. Comment Added ─────────────────────────────────────

describe('notifyCommentAdded', () => {
  it('public comment notifies reporter + assignee', async () => {
    await clearNotifications()
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
      assigneeId: world.agent1.id,
    })

    await notifyCommentAdded({
      type: 'comment_added',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: world.agent2.id,
      actorName: world.agent2.name!,
      reporterId: world.customer1.id,
      assigneeId: world.agent1.id,
      isInternal: false,
    })

    const reporterNotifs = await getNotifications(world.customer1.id)
    const assigneeNotifs = await getNotifications(world.agent1.id)
    expect(reporterNotifs).toHaveLength(1)
    expect(assigneeNotifs).toHaveLength(1)
    expect(reporterNotifs[0].message).toContain('commented on')
  })

  it('internal comment does NOT notify customer reporter', async () => {
    await clearNotifications()
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
      assigneeId: world.agent1.id,
    })

    await notifyCommentAdded({
      type: 'comment_added',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: world.agent2.id,
      actorName: world.agent2.name!,
      reporterId: world.customer1.id,
      assigneeId: world.agent1.id,
      isInternal: true,
    })

    // Customer reporter should NOT receive internal comment notification
    const reporterNotifs = await getNotifications(world.customer1.id)
    expect(reporterNotifs).toHaveLength(0)

    // Staff assignee should still receive it
    const assigneeNotifs = await getNotifications(world.agent1.id)
    expect(assigneeNotifs).toHaveLength(1)
  })

  it('does not notify when commenter is reporter', async () => {
    await clearNotifications()
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
      assigneeId: world.agent1.id,
    })

    await notifyCommentAdded({
      type: 'comment_added',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: world.customer1.id,
      actorName: world.customer1.name!,
      reporterId: world.customer1.id,
      assigneeId: world.agent1.id,
      isInternal: false,
    })

    // Reporter is actor → excluded, but assignee should receive
    const reporterNotifs = await getNotifications(world.customer1.id)
    const assigneeNotifs = await getNotifications(world.agent1.id)
    expect(reporterNotifs).toHaveLength(0)
    expect(assigneeNotifs).toHaveLength(1)
  })

  it('does not notify when no assignee and reporter is actor', async () => {
    await clearNotifications()
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })

    await notifyCommentAdded({
      type: 'comment_added',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: world.customer1.id,
      actorName: world.customer1.name!,
      reporterId: world.customer1.id,
      assigneeId: null,
      isInternal: false,
    })

    const reporterNotifs = await getNotifications(world.customer1.id)
    expect(reporterNotifs).toHaveLength(0)
  })

  it('deduplicates when reporter === assignee', async () => {
    await clearNotifications()
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.agent1.id,
      assigneeId: world.agent1.id,
    })

    await notifyCommentAdded({
      type: 'comment_added',
      issueId: issue.id,
      issueKey: issue.issueKey,
      actorId: world.agent2.id,
      actorName: world.agent2.name!,
      reporterId: world.agent1.id,
      assigneeId: world.agent1.id,
      isInternal: false,
    })

    // agent1 is both reporter and assignee → should only get 1 notification
    const notifs = await getNotifications(world.agent1.id)
    expect(notifs).toHaveLength(1)
  })
})
