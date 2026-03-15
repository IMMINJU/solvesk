/**
 * Integration: Edge cases and error handling
 *
 * Covers boundary conditions, deleted resources, invalid inputs,
 * and other scenarios that are hard to test in unit tests with mocks.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { db, projects, issues, users, comments } from '@/db'
import { eq } from 'drizzle-orm'
import { cleanDatabase } from './setup'
import { createTestWorld, createIssue, createComment, type TestWorld } from './fixtures'
import { issueService } from '@/features/issue/services/issue.service'
import { commentService } from '@/features/issue/services/comment.service'
import { projectService } from '@/features/project/services/project.service'
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors'

let world: TestWorld

beforeAll(async () => {
  await cleanDatabase()
  world = await createTestWorld()
})

// ── 1. Non-existent resources ────────────────────────────

describe('Non-existent resources', () => {
  it('getByKey throws NotFoundError for non-existent issue', async () => {
    await expect(issueService.getByKey(world.admin, 'ACME-99999')).rejects.toThrow(NotFoundError)
  })

  it('update throws NotFoundError for non-existent issue', async () => {
    await expect(issueService.update(world.admin, 'ACME-99999', { title: 'X' })).rejects.toThrow(
      NotFoundError
    )
  })

  it('updateStatus throws NotFoundError for non-existent issue', async () => {
    await expect(issueService.updateStatus(world.admin, 'ACME-99999', 'closed')).rejects.toThrow(
      NotFoundError
    )
  })

  it('delete throws NotFoundError for non-existent issue', async () => {
    await expect(issueService.delete(world.admin, 'ACME-99999')).rejects.toThrow(NotFoundError)
  })

  it('getById throws for non-existent project', async () => {
    await expect(projectService.getById(world.admin, 99999)).rejects.toThrow()
  })

  it('getByCode throws for non-existent project code', async () => {
    await expect(projectService.getByCode(world.admin, 'ZZZZZ')).rejects.toThrow()
  })
})

// ── 2. Cross-role access on specific resources ───────────

describe('Cross-role resource access', () => {
  it('customer cannot access issue from another project', async () => {
    const issue = await createIssue({
      projectId: world.projectB.id,
      reporterId: world.customer2.id,
    })

    // customer1 belongs to projectA, issue is in projectB
    await expect(issueService.getByKey(world.customer1, issue.issueKey)).rejects.toThrow(
      ForbiddenError
    )
  })

  it("customer cannot see private issue they didn't create", async () => {
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.agent1.id,
      isPrivate: true,
    })

    // customer1 is in projectA but not the reporter
    await expect(issueService.getByKey(world.customer1, issue.issueKey)).rejects.toThrow(
      ForbiddenError
    )
  })

  it('customer CAN see their own private issue', async () => {
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
      isPrivate: true,
    })

    const result = await issueService.getByKey(world.customer1, issue.issueKey)
    expect(result.id).toBe(issue.id)
  })

  it('agent2 cannot access issue in projectB (not assigned)', async () => {
    const issue = await createIssue({
      projectId: world.projectB.id,
      reporterId: world.customer2.id,
    })

    await expect(issueService.getByKey(world.agent2, issue.issueKey)).rejects.toThrow(
      ForbiddenError
    )
  })

  it('admin can access any issue in any project', async () => {
    const issueA = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
      isPrivate: true,
    })
    const issueB = await createIssue({
      projectId: world.projectB.id,
      reporterId: world.customer2.id,
    })

    const resultA = await issueService.getByKey(world.admin, issueA.issueKey)
    const resultB = await issueService.getByKey(world.admin, issueB.issueKey)
    expect(resultA.id).toBe(issueA.id)
    expect(resultB.id).toBe(issueB.id)
  })
})

// ── 3. Comment ownership ─────────────────────────────────

describe('Comment ownership enforcement', () => {
  it("user cannot edit another user's comment", async () => {
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })
    const comment = await createComment({
      issueId: issue.id,
      authorId: world.agent1.id,
      content: "<p>Agent's comment</p>",
    })

    // agent2 tries to edit agent1's comment
    await expect(commentService.update(world.agent2, comment.id, '<p>Hacked</p>')).rejects.toThrow(
      ForbiddenError
    )
  })

  it("admin cannot edit another user's comment", async () => {
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })
    const comment = await createComment({
      issueId: issue.id,
      authorId: world.agent1.id,
    })

    // Even admin cannot edit others' comments (only delete)
    await expect(
      commentService.update(world.admin, comment.id, '<p>Admin edit</p>')
    ).rejects.toThrow(ForbiddenError)
  })

  it('admin CAN delete any comment', async () => {
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })
    const comment = await createComment({
      issueId: issue.id,
      authorId: world.agent1.id,
    })

    // Should not throw
    await commentService.delete(world.admin, comment.id)

    const deleted = await db.query.comments.findFirst({
      where: eq(comments.id, comment.id),
    })
    expect(deleted).toBeUndefined()
  })

  it("non-admin cannot delete another user's comment", async () => {
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })
    const comment = await createComment({
      issueId: issue.id,
      authorId: world.agent1.id,
    })

    await expect(commentService.delete(world.agent2, comment.id)).rejects.toThrow(ForbiddenError)
  })
})

// ── 4. Customer field constraints ────────────────────────

describe('Customer field constraints via service', () => {
  it('customer status change rejects non-resolved values', async () => {
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
      status: 'open',
    })

    await expect(
      issueService.updateStatus(world.customer1, issue.issueKey, 'in_progress')
    ).rejects.toThrow(ForbiddenError)

    await expect(
      issueService.updateStatus(world.customer1, issue.issueKey, 'closed')
    ).rejects.toThrow(ForbiddenError)
  })

  it('customer CAN change status to resolved', async () => {
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
      status: 'open',
    })

    await issueService.updateStatus(world.customer1, issue.issueKey, 'resolved')

    const updated = await db.query.issues.findFirst({
      where: eq(issues.id, issue.id),
    })
    expect(updated!.status).toBe('resolved')
  })

  it('customer cannot change assignee', async () => {
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })

    await expect(
      issueService.updateAssignee(world.customer1, issue.issueKey, world.agent1.id)
    ).rejects.toThrow(ForbiddenError)
  })

  it('customer cannot change priority', async () => {
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })

    await expect(
      issueService.updatePriority(world.customer1, issue.issueKey, 'urgent')
    ).rejects.toThrow(ForbiddenError)
  })

  it('customer cannot create internal comment', async () => {
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })

    await expect(
      commentService.create(world.customer1, {
        issueId: issue.id,
        content: '<p>Internal?</p>',
        isInternal: true,
      })
    ).rejects.toThrow(ForbiddenError)
  })
})

// ── 5. Delete cascade ────────────────────────────────────

describe('Delete cascade behavior', () => {
  it('deleting an issue removes its comments', async () => {
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })
    await createComment({ issueId: issue.id, authorId: world.agent1.id })
    await createComment({ issueId: issue.id, authorId: world.agent2.id })

    await issueService.delete(world.admin, issue.issueKey)

    const remainingComments = await db.query.comments.findMany({
      where: eq(comments.issueId, issue.id),
    })
    expect(remainingComments).toHaveLength(0)
  })

  it('deleting a project removes its issues', async () => {
    const project = await projectService.create(world.admin, {
      name: 'Cascade Test',
      code: 'CSC',
    })

    await createIssue({ projectId: project.id, reporterId: world.admin.id })
    await createIssue({ projectId: project.id, reporterId: world.admin.id })

    await projectService.delete(world.admin, project.id)

    const remainingIssues = await db.query.issues.findMany({
      where: eq(issues.projectId, project.id),
    })
    expect(remainingIssues).toHaveLength(0)
  })
})

// ── 6. Role-based delete restrictions ────────────────────

describe('Delete restrictions', () => {
  it('only admin can delete issues', async () => {
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
    })

    await expect(issueService.delete(world.agent1, issue.issueKey)).rejects.toThrow(ForbiddenError)

    await expect(issueService.delete(world.customer1, issue.issueKey)).rejects.toThrow(
      ForbiddenError
    )

    // Admin can delete
    await issueService.delete(world.admin, issue.issueKey)
  })

  it('only admin can delete projects', async () => {
    const project = await projectService.create(world.admin, {
      name: 'Agent Delete Test',
      code: 'ADT',
    })

    await expect(projectService.delete(world.agent1, project.id)).rejects.toThrow(ForbiddenError)
  })
})
