/**
 * Integration: Pseudonym (Agent Name Masking)
 *
 * When a customer views issues/comments, staff names are replaced
 * with "Support Agent N" and emails/images are stripped.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { cleanDatabase } from './setup'
import { createTestWorld, createIssue, createComment, type TestWorld } from './fixtures'
import { issueService } from '@/features/issue/services/issue.service'
import { commentService } from '@/features/issue/services/comment.service'
import { projectService } from '@/features/project/services/project.service'

let w: TestWorld
let testIssue: Awaited<ReturnType<typeof createIssue>>

beforeAll(async () => {
  await cleanDatabase()
  w = await createTestWorld()

  testIssue = await createIssue({
    projectId: w.projectA.id,
    reporterId: w.customer1.id,
    assigneeId: w.agent1.id,
    title: 'Pseudonym test issue',
  })

  // Add comments from different staff
  await createComment({
    issueId: testIssue.id,
    authorId: w.agent1.id,
    content: '<p>Agent1 comment</p>',
  })
  await createComment({
    issueId: testIssue.id,
    authorId: w.admin.id,
    content: '<p>Admin comment</p>',
  })
  await createComment({
    issueId: testIssue.id,
    authorId: w.customer1.id,
    content: '<p>Customer reply</p>',
  })
})

// ── Customer View (masked) ────────────────────────

describe('Customer View — Pseudonyms Applied', () => {
  it('assignee name is masked in issue detail', async () => {
    const issue = await issueService.getByKey(w.customer1, testIssue.issueKey)
    expect(issue.assignee?.name).toMatch(/^Support Agent \d+$/)
  })

  it('assignee email is stripped', async () => {
    const issue = await issueService.getByKey(w.customer1, testIssue.issueKey)
    expect(issue.assignee?.email).toBeUndefined()
  })

  it('assignee image is nulled', async () => {
    const issue = await issueService.getByKey(w.customer1, testIssue.issueKey)
    expect(issue.assignee?.image).toBeNull()
  })

  it('staff comment authors are masked', async () => {
    const issue = await issueService.getByKey(w.customer1, testIssue.issueKey)

    for (const comment of issue.comments) {
      if (comment.author?.id !== w.customer1.id) {
        // Staff author — should be masked
        expect(comment.author?.name).toMatch(/^Support Agent \d+$/)
      }
    }
  })

  it("customer's own name is preserved in reporter", async () => {
    const issue = await issueService.getByKey(w.customer1, testIssue.issueKey)
    expect(issue.reporter?.name).toBe('Charlie Customer')
  })

  it("customer's own name is preserved in comments", async () => {
    const issue = await issueService.getByKey(w.customer1, testIssue.issueKey)
    const customerComment = issue.comments.find(
      (c: { author: { id: string } | null }) => c.author?.id === w.customer1.id
    )
    expect(customerComment?.author?.name).toBe('Charlie Customer')
  })

  it('same staff member gets consistent pseudonym number', async () => {
    const issue = await issueService.getByKey(w.customer1, testIssue.issueKey)

    // agent1 appears as assignee and comment author
    const assigneeName = issue.assignee?.name
    const agent1Comment = issue.comments.find(
      (c: { author: { id: string } | null }) => c.author?.id === w.agent1.id
    )
    expect(assigneeName).toBe(agent1Comment?.author?.name)
  })
})

// ── Customer View in Issue List ───────────────────

describe('Customer View — Issue List Pseudonyms', () => {
  it('assignee names are masked in list view', async () => {
    const result = await issueService.list(w.customer1)

    for (const issue of result.data) {
      if (issue.assignee && issue.assignee.id !== w.customer1.id) {
        expect(issue.assignee.name).toMatch(/^Support Agent \d+$/)
      }
    }
  })
})

// ── Customer View in Comment List ─────────────────

describe('Customer View — Comment List Pseudonyms', () => {
  it('staff authors masked in listByIssueKey', async () => {
    const comments = await commentService.listByIssueKey(w.customer1, testIssue.issueKey)

    for (const c of comments) {
      if (c.author && c.author.id !== w.customer1.id) {
        expect(c.author.name).toMatch(/^Support Agent \d+$/)
      }
    }
  })
})

// ── Customer View in Project Users ────────────────

describe('Customer View — Project Users Pseudonyms', () => {
  it('staff names are masked in getProjectUsers', async () => {
    const users = await projectService.getProjectUsers(w.customer1, w.projectA.id)

    for (const u of users) {
      if (u.role !== 'customer') {
        expect(u.name).toMatch(/^Support Agent \d+$/)
        expect(u.email).toBeUndefined()
        expect(u.image).toBeNull()
      }
    }
  })
})

// ── Staff View (no masking) ───────────────────────

describe('Staff View — No Masking', () => {
  it('admin sees real names in issue detail', async () => {
    const issue = await issueService.getByKey(w.admin, testIssue.issueKey)
    expect(issue.assignee?.name).toBe('Alice Agent')
    expect(issue.assignee?.email).toBe('agent1@test.com')
  })

  it('agent sees real names in issue detail', async () => {
    const issue = await issueService.getByKey(w.agent1, testIssue.issueKey)
    expect(issue.assignee?.name).toBe('Alice Agent')
    expect(issue.assignee?.email).toBe('agent1@test.com')
  })

  it('admin sees real names in issue list', async () => {
    const result = await issueService.list(w.admin)
    for (const issue of result.data) {
      if (issue.assignee) {
        expect(issue.assignee.name).not.toMatch(/^Support Agent \d+$/)
      }
    }
  })

  it('admin sees real names in project users', async () => {
    const users = await projectService.getProjectUsers(w.admin, w.projectA.id)
    for (const u of users) {
      expect(u.name).not.toMatch(/^Support Agent \d+$/)
      expect(u.email).toBeTruthy()
    }
  })
})
