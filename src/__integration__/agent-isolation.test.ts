/**
 * Integration: Agent Project Membership Isolation
 *
 * agent1 — assigned to A + B
 * agent2 — assigned to A only
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { cleanDatabase } from './setup'
import { createTestWorld, createIssue, type TestWorld } from './fixtures'
import { issueService } from '@/features/issue/services/issue.service'
import { commentService } from '@/features/issue/services/comment.service'
import { projectService } from '@/features/project/services/project.service'
import { projectMembershipService } from '@/features/project/services/project-membership.service'
import { ForbiddenError } from '@/lib/errors'

let w: TestWorld
let issueA: Awaited<ReturnType<typeof createIssue>>
let issueB: Awaited<ReturnType<typeof createIssue>>

beforeAll(async () => {
  await cleanDatabase()
  w = await createTestWorld()

  issueA = await createIssue({
    projectId: w.projectA.id,
    reporterId: w.customer1.id,
    assigneeId: w.agent1.id,
    title: 'Issue in project A',
  })

  issueB = await createIssue({
    projectId: w.projectB.id,
    reporterId: w.customer2.id,
    assigneeId: w.agent1.id,
    title: 'Issue in project B',
  })
})

// ── Project Visibility ────────────────────────────

describe('Agent Project Visibility', () => {
  it('agent1 sees both projects', async () => {
    const result = await projectService.list(w.agent1)
    const codes = result.map(p => p.code)
    expect(codes).toContain('ACME')
    expect(codes).toContain('GLX')
  })

  it('agent2 sees only ACME', async () => {
    const result = await projectService.list(w.agent2)
    const codes = result.map(p => p.code)
    expect(codes).toContain('ACME')
    expect(codes).not.toContain('GLX')
  })

  it('agent2 cannot access project B by ID', async () => {
    await expect(projectService.getById(w.agent2, w.projectB.id)).rejects.toThrow(ForbiddenError)
  })

  it('agent2 cannot access project B by code', async () => {
    await expect(projectService.getByCode(w.agent2, 'GLX')).rejects.toThrow(ForbiddenError)
  })
})

// ── Issue Access Isolation ────────────────────────

describe('Agent Issue Access', () => {
  it('agent1 can access issues in both projects', async () => {
    const a = await issueService.getByKey(w.agent1, issueA.issueKey)
    const b = await issueService.getByKey(w.agent1, issueB.issueKey)
    expect(a.title).toBe('Issue in project A')
    expect(b.title).toBe('Issue in project B')
  })

  it('agent2 can access issue in project A', async () => {
    const issue = await issueService.getByKey(w.agent2, issueA.issueKey)
    expect(issue.title).toBe('Issue in project A')
  })

  it('agent2 cannot access issue in project B', async () => {
    await expect(issueService.getByKey(w.agent2, issueB.issueKey)).rejects.toThrow(ForbiddenError)
  })

  it('agent2 issue list contains only project A issues', async () => {
    const result = await issueService.list(w.agent2)
    for (const issue of result.data) {
      expect(issue.project?.code).toBe('ACME')
    }
  })

  it('agent1 issue list contains issues from both projects', async () => {
    const result = await issueService.list(w.agent1)
    const codes = new Set(result.data.map(i => i.project?.code))
    expect(codes).toContain('ACME')
    expect(codes).toContain('GLX')
  })
})

// ── Cross-Project Write Operations ────────────────

describe('Agent Cross-Project Write Restrictions', () => {
  it('agent2 cannot create issue in project B', async () => {
    await expect(
      issueService.create(w.agent2, {
        projectId: w.projectB.id,
        title: 'Should fail',
        type: 'bug',
        priority: 'medium',
      })
    ).rejects.toThrow(ForbiddenError)
  })

  it('agent2 cannot update status on project B issue', async () => {
    await expect(
      issueService.updateStatus(w.agent2, issueB.issueKey, 'in_progress')
    ).rejects.toThrow(ForbiddenError)
  })

  it('agent2 cannot update priority on project B issue', async () => {
    await expect(issueService.updatePriority(w.agent2, issueB.issueKey, 'urgent')).rejects.toThrow(
      ForbiddenError
    )
  })

  it('agent2 cannot assign on project B issue', async () => {
    await expect(
      issueService.updateAssignee(w.agent2, issueB.issueKey, w.agent2.id)
    ).rejects.toThrow(ForbiddenError)
  })

  it('agent2 cannot comment on project B issue', async () => {
    await expect(
      commentService.createByIssueKey(w.agent2, issueB.issueKey, {
        content: '<p>Should fail</p>',
      })
    ).rejects.toThrow(ForbiddenError)
  })
})

// ── Dynamic Membership Changes ────────────────────

describe('Dynamic Membership', () => {
  it('adding agent2 to project B grants access', async () => {
    // Before: no access
    await expect(issueService.getByKey(w.agent2, issueB.issueKey)).rejects.toThrow(ForbiddenError)

    // Add membership
    await projectMembershipService.addMember(w.admin, w.projectB.id, w.agent2.id)

    // After: access granted
    const issue = await issueService.getByKey(w.agent2, issueB.issueKey)
    expect(issue.title).toBe('Issue in project B')

    // Cleanup: remove membership
    await projectMembershipService.removeMember(w.admin, w.projectB.id, w.agent2.id)
  })

  it('removing agent2 from project A revokes access', async () => {
    // Before: has access
    await expect(issueService.getByKey(w.agent2, issueA.issueKey)).resolves.toBeDefined()

    // Remove membership
    await projectMembershipService.removeMember(w.admin, w.projectA.id, w.agent2.id)

    // After: no access
    await expect(issueService.getByKey(w.agent2, issueA.issueKey)).rejects.toThrow(ForbiddenError)

    // Cleanup: restore membership
    await projectMembershipService.addMember(w.admin, w.projectA.id, w.agent2.id)
  })

  it('agent with no memberships sees empty issue list', async () => {
    // Check current membership first, remove only if exists
    const canAccess = await projectMembershipService.canAccessProject(w.agent2.id, w.projectA.id)
    if (canAccess) {
      await projectMembershipService.removeMember(w.admin, w.projectA.id, w.agent2.id)
    }

    const result = await issueService.list(w.agent2)
    expect(result.data).toHaveLength(0)
    expect(result.total).toBe(0)

    // Restore
    await projectMembershipService.addMember(w.admin, w.projectA.id, w.agent2.id)
  })
})
