/**
 * Integration: Customer Isolation
 *
 * The most critical multi-tenancy test file.
 * Verifies customers cannot cross project boundaries.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { cleanDatabase } from './setup'
import { createTestWorld, createIssue, createComment, type TestWorld } from './fixtures'
import { issueService } from '@/features/issue/services/issue.service'
import { commentService } from '@/features/issue/services/comment.service'
import { projectService } from '@/features/project/services/project.service'
import { ForbiddenError } from '@/lib/errors'

let w: TestWorld

// Issues created in beforeAll for cross-test reference
let publicIssueA: Awaited<ReturnType<typeof createIssue>>
let privateIssueA_byCust1: Awaited<ReturnType<typeof createIssue>>
let privateIssueA_byAgent: Awaited<ReturnType<typeof createIssue>>
let issueB: Awaited<ReturnType<typeof createIssue>>

beforeAll(async () => {
  await cleanDatabase()
  w = await createTestWorld()

  // Project A issues
  publicIssueA = await createIssue({
    projectId: w.projectA.id,
    reporterId: w.customer1.id,
    assigneeId: w.agent1.id,
    title: 'Public issue in A',
  })

  privateIssueA_byCust1 = await createIssue({
    projectId: w.projectA.id,
    reporterId: w.customer1.id,
    title: 'Private by customer1',
    isPrivate: true,
  })

  privateIssueA_byAgent = await createIssue({
    projectId: w.projectA.id,
    reporterId: w.agent1.id,
    title: 'Private by agent',
    isPrivate: true,
  })

  // Project B issue
  issueB = await createIssue({
    projectId: w.projectB.id,
    reporterId: w.customer2.id,
    assigneeId: w.agent1.id,
    title: 'Issue in B',
  })

  // Comments on publicIssueA
  await createComment({
    issueId: publicIssueA.id,
    authorId: w.agent1.id,
    content: '<p>Public comment by agent</p>',
  })
  await createComment({
    issueId: publicIssueA.id,
    authorId: w.agent1.id,
    content: '<p>Internal note</p>',
    isInternal: true,
  })
  await createComment({
    issueId: publicIssueA.id,
    authorId: w.customer1.id,
    content: '<p>Customer reply</p>',
  })
})

// ── Cross-Project Access ──────────────────────────

describe('Cross-Project Isolation', () => {
  it('customer1 (A) cannot access project B issue via getByKey', async () => {
    await expect(issueService.getByKey(w.customer1, issueB.issueKey)).rejects.toThrow(
      ForbiddenError
    )
  })

  it('customer2 (B) cannot access project A issue via getByKey', async () => {
    await expect(issueService.getByKey(w.customer2, publicIssueA.issueKey)).rejects.toThrow(
      ForbiddenError
    )
  })

  it('customer1 issue list contains only project A issues', async () => {
    const result = await issueService.list(w.customer1)
    for (const issue of result.data) {
      expect(issue.project?.code).toBe('ACME')
    }
    // Should not contain project B issues
    const keys = result.data.map(i => i.issueKey)
    expect(keys).not.toContain(issueB.issueKey)
  })

  it('customer1 cannot create issue in project B', async () => {
    await expect(
      issueService.create(w.customer1, {
        projectId: w.projectB.id,
        title: 'Should fail',
        type: 'bug',
        priority: 'medium',
      })
    ).rejects.toThrow(ForbiddenError)
  })

  it('customer1 project list shows only project A', async () => {
    const result = await projectService.list(w.customer1)
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('ACME')
  })

  it('customer1 cannot access project B by ID', async () => {
    await expect(projectService.getById(w.customer1, w.projectB.id)).rejects.toThrow(ForbiddenError)
  })
})

// ── Private Issue Access ──────────────────────────

describe('Private Issue Visibility', () => {
  it('customer1 can see own private issue', async () => {
    const issue = await issueService.getByKey(w.customer1, privateIssueA_byCust1.issueKey)
    expect(issue.isPrivate).toBe(true)
    expect(issue.title).toBe('Private by customer1')
  })

  it('customer1 cannot see private issue by another reporter', async () => {
    // privateIssueA_byAgent is in project A but created by agent, isPrivate=true
    // customer1 should NOT see it (not the reporter + isPrivate)
    await expect(
      issueService.getByKey(w.customer1, privateIssueA_byAgent.issueKey)
    ).rejects.toThrow(ForbiddenError)
  })

  it("customer1 issue list excludes other's private issues", async () => {
    const result = await issueService.list(w.customer1)
    const keys = result.data.map(i => i.issueKey)
    expect(keys).toContain(privateIssueA_byCust1.issueKey) // own private
    expect(keys).not.toContain(privateIssueA_byAgent.issueKey) // other's private
  })

  it('admin can see all private issues', async () => {
    const issue = await issueService.getByKey(w.admin, privateIssueA_byAgent.issueKey)
    expect(issue.isPrivate).toBe(true)
  })
})

// ── Internal Comments ─────────────────────────────

describe('Internal Comment Filtering', () => {
  it('customer cannot see internal comments in getByKey', async () => {
    const issue = await issueService.getByKey(w.customer1, publicIssueA.issueKey)
    for (const comment of issue.comments) {
      expect(comment.isInternal).toBe(false)
    }
    // Should have 2 visible comments (public agent + customer reply)
    expect(issue.comments).toHaveLength(2)
  })

  it('agent sees all comments including internal', async () => {
    const issue = await issueService.getByKey(w.agent1, publicIssueA.issueKey)
    const internalComments = issue.comments.filter((c: { isInternal: boolean }) => c.isInternal)
    expect(internalComments).toHaveLength(1)
    expect(issue.comments).toHaveLength(3)
  })

  it('customer cannot create internal comment', async () => {
    await expect(
      commentService.createByIssueKey(w.customer1, publicIssueA.issueKey, {
        content: '<p>Secret</p>',
        isInternal: true,
      })
    ).rejects.toThrow(ForbiddenError)
  })

  it('customer cannot see internal comments via listByIssueKey', async () => {
    const comments = await commentService.listByIssueKey(w.customer1, publicIssueA.issueKey)
    for (const c of comments) {
      expect(c.isInternal).toBe(false)
    }
  })
})

// ── Customer Status Constraints ───────────────────

describe('Customer Status Constraints', () => {
  it('customer can change status to resolved', async () => {
    const updated = await issueService.updateStatus(w.customer1, publicIssueA.issueKey, 'resolved')
    expect(updated.status).toBe('resolved')
  })

  it('customer cannot change status to in_progress', async () => {
    await expect(
      issueService.updateStatus(w.customer1, publicIssueA.issueKey, 'in_progress')
    ).rejects.toThrow(ForbiddenError)
  })

  it('customer cannot change status to closed', async () => {
    await expect(
      issueService.updateStatus(w.customer1, publicIssueA.issueKey, 'closed')
    ).rejects.toThrow(ForbiddenError)
  })

  it('customer cannot change status to waiting', async () => {
    await expect(
      issueService.updateStatus(w.customer1, publicIssueA.issueKey, 'waiting')
    ).rejects.toThrow(ForbiddenError)
  })

  it('customer cannot change status to open', async () => {
    await expect(
      issueService.updateStatus(w.customer1, publicIssueA.issueKey, 'open')
    ).rejects.toThrow(ForbiddenError)
  })
})

// ── Customer Field Constraints ────────────────────

describe('Customer Field Constraints', () => {
  it('customer cannot assign users', async () => {
    await expect(
      issueService.updateAssignee(w.customer1, publicIssueA.issueKey, w.agent1.id)
    ).rejects.toThrow(ForbiddenError)
  })

  it('customer cannot change priority', async () => {
    await expect(
      issueService.updatePriority(w.customer1, publicIssueA.issueKey, 'urgent')
    ).rejects.toThrow(ForbiddenError)
  })

  it('customer issue creation forces medium priority', async () => {
    const issue = await issueService.create(w.customer1, {
      projectId: w.projectA.id,
      title: 'Customer priority test',
      type: 'bug',
      priority: 'urgent', // should be overridden
    })
    expect(issue.priority).toBe('medium')
  })

  it('customer issue creation strips assignee', async () => {
    const issue = await issueService.create(w.customer1, {
      projectId: w.projectA.id,
      title: 'Customer assignee test',
      type: 'bug',
      priority: 'medium',
      assigneeId: w.agent1.id, // should be stripped
    })
    expect(issue.assigneeId).toBeNull()
  })

  it('customer issue creation strips dueDate', async () => {
    const issue = await issueService.create(w.customer1, {
      projectId: w.projectA.id,
      title: 'Customer dueDate test',
      type: 'bug',
      priority: 'medium',
      dueDate: '2025-12-31',
    })
    expect(issue.dueDate).toBeNull()
  })
})

// ── Cross-Project Comment Access ──────────────────

describe('Cross-Project Comment Access', () => {
  it('customer1 cannot comment on project B issue', async () => {
    await expect(
      commentService.createByIssueKey(w.customer1, issueB.issueKey, {
        content: '<p>Should fail</p>',
      })
    ).rejects.toThrow(ForbiddenError)
  })

  it('customer2 cannot comment on project A issue', async () => {
    await expect(
      commentService.createByIssueKey(w.customer2, publicIssueA.issueKey, {
        content: '<p>Should fail</p>',
      })
    ).rejects.toThrow(ForbiddenError)
  })
})
