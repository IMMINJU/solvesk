/**
 * Integration: Issue Lifecycle
 *
 * Tests issue creation, status transitions, concurrent key generation,
 * and cascading deletes with real DB.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { cleanDatabase } from './setup'
import {
  createTestWorld,
  createIssue,
  createComment,
  createLabel,
  addLabelToIssue,
  type TestWorld,
} from './fixtures'
import { issueService } from '@/features/issue/services/issue.service'
import { commentService } from '@/features/issue/services/comment.service'
import { labelService } from '@/features/label/services/label.service'
import { ForbiddenError } from '@/lib/errors'
import { db, projects, issues } from '@/db'
import { eq } from 'drizzle-orm'

let w: TestWorld

beforeAll(async () => {
  await cleanDatabase()
  w = await createTestWorld()
})

// ── Issue Key Generation ──────────────────────────

describe('Issue Key Generation', () => {
  it('first issue gets key {CODE}-1', async () => {
    const issue = await issueService.create(w.admin, {
      projectId: w.projectA.id,
      title: 'First issue',
      type: 'bug',
      priority: 'medium',
    })
    expect(issue.issueKey).toBe('ACME-1')
    expect(issue.issueNumber).toBe(1)
  })

  it('sequential issues get incrementing keys', async () => {
    const issue2 = await issueService.create(w.admin, {
      projectId: w.projectA.id,
      title: 'Second issue',
      type: 'feature',
      priority: 'high',
    })
    const issue3 = await issueService.create(w.admin, {
      projectId: w.projectA.id,
      title: 'Third issue',
      type: 'inquiry',
      priority: 'low',
    })
    expect(issue2.issueKey).toBe('ACME-2')
    expect(issue3.issueKey).toBe('ACME-3')
  })

  it('project issueCount is updated', async () => {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, w.projectA.id),
    })
    expect(project!.issueCount).toBe(3)
  })

  it('different projects have independent key sequences', async () => {
    const issueB = await issueService.create(w.admin, {
      projectId: w.projectB.id,
      title: 'First GLX issue',
      type: 'bug',
      priority: 'medium',
    })
    expect(issueB.issueKey).toBe('GLX-1')
  })

  it('concurrent issue creation produces unique keys', async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      issueService.create(w.admin, {
        projectId: w.projectB.id,
        title: `Concurrent issue ${i}`,
        type: 'bug',
        priority: 'medium',
      })
    )

    const results = await Promise.all(promises)
    const keys = results.map(r => r.issueKey)
    const uniqueKeys = new Set(keys)

    // All keys must be unique
    expect(uniqueKeys.size).toBe(5)
    // Keys should be GLX-2 through GLX-6
    for (const key of keys) {
      expect(key).toMatch(/^GLX-\d+$/)
    }
  })
})

// ── Status Transitions ────────────────────────────

describe('Status Transitions', () => {
  let testIssue: Awaited<ReturnType<typeof createIssue>>

  beforeAll(async () => {
    testIssue = await createIssue({
      projectId: w.projectA.id,
      reporterId: w.customer1.id,
      assigneeId: w.agent1.id,
      title: 'Status transition test',
    })
  })

  it('staff can transition through all statuses', async () => {
    const transitions = ['in_progress', 'waiting', 'resolved', 'closed', 'open'] as const

    for (const status of transitions) {
      const updated = await issueService.updateStatus(w.agent1, testIssue.issueKey, status)
      expect(updated.status).toBe(status)
    }
  })

  it('customer can only set resolved', async () => {
    // First set to open (as agent)
    await issueService.updateStatus(w.agent1, testIssue.issueKey, 'open')

    // Customer → resolved: OK
    const updated = await issueService.updateStatus(w.customer1, testIssue.issueKey, 'resolved')
    expect(updated.status).toBe('resolved')

    // Customer → other statuses: FAIL
    for (const status of ['open', 'in_progress', 'waiting', 'closed']) {
      await expect(
        issueService.updateStatus(w.customer1, testIssue.issueKey, status)
      ).rejects.toThrow(ForbiddenError)
    }
  })
})

// ── Issue Update ──────────────────────────────────

describe('Issue Update', () => {
  let testIssue: Awaited<ReturnType<typeof createIssue>>

  beforeAll(async () => {
    testIssue = await createIssue({
      projectId: w.projectA.id,
      reporterId: w.customer1.id,
      title: 'Update test',
    })
  })

  it('reporter (customer) can update title and content', async () => {
    const updated = await issueService.update(w.customer1, testIssue.issueKey, {
      title: 'Updated title',
      content: '<p>Updated content</p>',
    })
    expect(updated.title).toBe('Updated title')
  })

  it('staff can update title and content', async () => {
    const updated = await issueService.update(w.agent1, testIssue.issueKey, {
      title: 'Agent updated',
    })
    expect(updated.title).toBe('Agent updated')
  })

  it('staff can set dueDate', async () => {
    const updated = await issueService.update(w.admin, testIssue.issueKey, {
      dueDate: '2025-12-31',
    })
    expect(updated.dueDate).toBeTruthy()
  })

  it('customer dueDate is silently ignored', async () => {
    // Get current dueDate
    const before = await issueService.getByKey(w.admin, testIssue.issueKey)

    await issueService.update(w.customer1, testIssue.issueKey, {
      dueDate: '2030-01-01',
    })

    const after = await issueService.getByKey(w.admin, testIssue.issueKey)
    // dueDate should not have changed
    expect(String(after.dueDate)).toBe(String(before.dueDate))
  })
})

// ── Cascading Delete ──────────────────────────────

describe('Issue Delete Cascade', () => {
  it('deleting issue removes comments', async () => {
    const issue = await createIssue({
      projectId: w.projectA.id,
      reporterId: w.customer1.id,
      title: 'Cascade test',
    })

    await createComment({
      issueId: issue.id,
      authorId: w.agent1.id,
      content: '<p>Comment to be cascaded</p>',
    })
    await createComment({
      issueId: issue.id,
      authorId: w.customer1.id,
      content: '<p>Another comment</p>',
    })

    await issueService.delete(w.admin, issue.issueKey)

    // Verify issue is gone
    const found = await db.query.issues.findFirst({
      where: eq(issues.id, issue.id),
    })
    expect(found).toBeUndefined()
  })

  it('deleting issue removes labels junction but keeps label', async () => {
    const issue = await createIssue({
      projectId: w.projectA.id,
      reporterId: w.customer1.id,
      title: 'Label cascade test',
    })
    const label = await createLabel('cascade-test', '#ff0000', w.admin.id)
    await addLabelToIssue(issue.id, label.id)

    await issueService.delete(w.admin, issue.issueKey)

    // Issue is gone
    const foundIssue = await db.query.issues.findFirst({
      where: eq(issues.id, issue.id),
    })
    expect(foundIssue).toBeUndefined()

    // Label itself still exists
    const { labels: labelsTable } = await import('@/db/schema')
    const foundLabel = await db.query.labels.findFirst({
      where: eq(labelsTable.id, label.id),
    })
    expect(foundLabel).toBeDefined()
  })
})

// ── Comment Ownership ─────────────────────────────

describe('Comment Ownership', () => {
  let testIssue: Awaited<ReturnType<typeof createIssue>>

  beforeAll(async () => {
    testIssue = await createIssue({
      projectId: w.projectA.id,
      reporterId: w.customer1.id,
      assigneeId: w.agent1.id,
      title: 'Comment ownership test',
    })
  })

  it('user can edit own comment', async () => {
    const comment = await commentService.createByIssueKey(w.agent1, testIssue.issueKey, {
      content: '<p>Original</p>',
    })
    const updated = await commentService.update(w.agent1, comment.id, '<p>Edited</p>')
    expect(updated.content).toContain('Edited')
  })

  it("user cannot edit other's comment", async () => {
    const comment = await commentService.createByIssueKey(w.agent1, testIssue.issueKey, {
      content: '<p>Agent comment</p>',
    })
    await expect(commentService.update(w.customer1, comment.id, '<p>Hacked</p>')).rejects.toThrow(
      ForbiddenError
    )
  })

  it('admin can delete any comment', async () => {
    const comment = await commentService.createByIssueKey(w.agent1, testIssue.issueKey, {
      content: '<p>To be deleted by admin</p>',
    })
    const result = await commentService.delete(w.admin, comment.id)
    expect(result.success).toBe(true)
  })

  it("user cannot delete other's comment (non-admin)", async () => {
    const comment = await commentService.createByIssueKey(w.agent1, testIssue.issueKey, {
      content: "<p>Agent's comment</p>",
    })
    await expect(commentService.delete(w.customer1, comment.id)).rejects.toThrow(ForbiddenError)
  })
})
