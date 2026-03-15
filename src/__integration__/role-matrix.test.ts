/**
 * Integration: 3-Tier RBAC Role Matrix
 *
 * Tests each service method against all 5 user personas:
 *   admin, agent1 (assigned), agent2 (partial), customer1 (own), customer2 (other)
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { cleanDatabase } from './setup'
import { createTestWorld, createIssue, type TestWorld } from './fixtures'
import { projectService } from '@/features/project/services/project.service'
import { issueService } from '@/features/issue/services/issue.service'
import { commentService } from '@/features/issue/services/comment.service'
import { userService } from '@/features/user/services/user.service'
import { projectMembershipService } from '@/features/project/services/project-membership.service'
import { ForbiddenError } from '@/lib/errors'

let w: TestWorld
let issueA1: Awaited<ReturnType<typeof createIssue>>

beforeAll(async () => {
  await cleanDatabase()
  w = await createTestWorld()
  issueA1 = await createIssue({
    projectId: w.projectA.id,
    reporterId: w.customer1.id,
    assigneeId: w.agent1.id,
  })
})

// ── Project Access ────────────────────────────────

describe('Project List', () => {
  it('admin sees all projects', async () => {
    const result = await projectService.list(w.admin)
    expect(result).toHaveLength(2)
  })

  it('agent1 sees assigned projects (A + B)', async () => {
    const result = await projectService.list(w.agent1)
    expect(result).toHaveLength(2)
  })

  it('agent2 sees only assigned project (A)', async () => {
    const result = await projectService.list(w.agent2)
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('ACME')
  })

  it('customer1 sees only own project (A)', async () => {
    const result = await projectService.list(w.customer1)
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('ACME')
  })

  it('customer2 sees only own project (B)', async () => {
    const result = await projectService.list(w.customer2)
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('GLX')
  })
})

describe('Project Create', () => {
  it('admin can create project', async () => {
    const p = await projectService.create(w.admin, {
      name: 'Test Project',
      code: 'TEST',
      description: 'test',
    })
    expect(p.code).toBe('TEST')
  })

  it('agent cannot create project', async () => {
    await expect(projectService.create(w.agent1, { name: 'X', code: 'XX' })).rejects.toThrow(
      ForbiddenError
    )
  })

  it('customer cannot create project', async () => {
    await expect(projectService.create(w.customer1, { name: 'X', code: 'XC' })).rejects.toThrow(
      ForbiddenError
    )
  })
})

describe('Project Delete', () => {
  it('admin can delete project', async () => {
    const p = await projectService.create(w.admin, {
      name: 'ToDelete',
      code: 'DEL',
    })
    await expect(projectService.delete(w.admin, p.id)).resolves.toBeUndefined()
  })

  it('agent cannot delete project', async () => {
    await expect(projectService.delete(w.agent1, w.projectA.id)).rejects.toThrow(ForbiddenError)
  })

  it('customer cannot delete project', async () => {
    await expect(projectService.delete(w.customer1, w.projectA.id)).rejects.toThrow(ForbiddenError)
  })
})

// ── Issue CRUD ────────────────────────────────────

describe('Issue Create', () => {
  it('admin can create issue in any project', async () => {
    const issue = await issueService.create(w.admin, {
      projectId: w.projectB.id,
      title: 'Admin issue in B',
      type: 'bug',
      priority: 'medium',
    })
    expect(issue.issueKey).toMatch(/^GLX-/)
  })

  it('agent1 can create issue in assigned project A', async () => {
    const issue = await issueService.create(w.agent1, {
      projectId: w.projectA.id,
      title: 'Agent1 issue in A',
      type: 'feature',
      priority: 'high',
    })
    expect(issue.issueKey).toMatch(/^ACME-/)
  })

  it('agent2 cannot create issue in unassigned project B', async () => {
    await expect(
      issueService.create(w.agent2, {
        projectId: w.projectB.id,
        title: 'Should fail',
        type: 'bug',
        priority: 'medium',
      })
    ).rejects.toThrow(ForbiddenError)
  })

  it('customer1 can create issue in own project A', async () => {
    const issue = await issueService.create(w.customer1, {
      projectId: w.projectA.id,
      title: 'Customer1 issue',
      type: 'inquiry',
      priority: 'urgent', // should be forced to medium
    })
    expect(issue.priority).toBe('medium')
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
})

describe('Issue Delete', () => {
  it('admin can delete issue', async () => {
    const issue = await createIssue({
      projectId: w.projectA.id,
      reporterId: w.customer1.id,
    })
    await expect(issueService.delete(w.admin, issue.issueKey)).resolves.toBeUndefined()
  })

  it('agent cannot delete issue', async () => {
    await expect(issueService.delete(w.agent1, issueA1.issueKey)).rejects.toThrow(ForbiddenError)
  })

  it('customer cannot delete issue', async () => {
    await expect(issueService.delete(w.customer1, issueA1.issueKey)).rejects.toThrow(ForbiddenError)
  })
})

// ── Issue Status/Priority/Assignee ────────────────

describe('Issue Assignee', () => {
  it('admin can assign', async () => {
    const updated = await issueService.updateAssignee(w.admin, issueA1.issueKey, w.agent2.id)
    expect(updated.assigneeId).toBe(w.agent2.id)
  })

  it('agent can assign (in assigned project)', async () => {
    const updated = await issueService.updateAssignee(w.agent1, issueA1.issueKey, w.agent1.id)
    expect(updated.assigneeId).toBe(w.agent1.id)
  })

  it('customer cannot assign', async () => {
    await expect(
      issueService.updateAssignee(w.customer1, issueA1.issueKey, w.agent1.id)
    ).rejects.toThrow(ForbiddenError)
  })
})

describe('Issue Priority', () => {
  it('admin can change priority', async () => {
    const updated = await issueService.updatePriority(w.admin, issueA1.issueKey, 'urgent')
    expect(updated.priority).toBe('urgent')
  })

  it('agent can change priority', async () => {
    const updated = await issueService.updatePriority(w.agent1, issueA1.issueKey, 'low')
    expect(updated.priority).toBe('low')
  })

  it('customer cannot change priority', async () => {
    await expect(
      issueService.updatePriority(w.customer1, issueA1.issueKey, 'high')
    ).rejects.toThrow(ForbiddenError)
  })
})

// ── Comment Permissions ───────────────────────────

describe('Internal Comments', () => {
  it('admin can create internal comment', async () => {
    const comment = await commentService.createByIssueKey(w.admin, issueA1.issueKey, {
      content: '<p>Internal note</p>',
      isInternal: true,
    })
    expect(comment.isInternal).toBe(true)
  })

  it('agent can create internal comment', async () => {
    const comment = await commentService.createByIssueKey(w.agent1, issueA1.issueKey, {
      content: '<p>Agent internal</p>',
      isInternal: true,
    })
    expect(comment.isInternal).toBe(true)
  })

  it('customer cannot create internal comment', async () => {
    await expect(
      commentService.createByIssueKey(w.customer1, issueA1.issueKey, {
        content: '<p>Secret</p>',
        isInternal: true,
      })
    ).rejects.toThrow(ForbiddenError)
  })
})

// ── User Management (Admin Only) ──────────────────

describe('User List', () => {
  it('admin can list users', async () => {
    const result = await userService.list()
    expect(result.data.length).toBeGreaterThanOrEqual(5)
  })
})

// ── Project Membership (Admin Only) ───────────────

describe('Project Membership', () => {
  it('admin can list members', async () => {
    const members = await projectMembershipService.listMembers(w.admin, w.projectA.id)
    expect(members.length).toBeGreaterThanOrEqual(2)
  })

  it('agent cannot list members', async () => {
    await expect(projectMembershipService.listMembers(w.agent1, w.projectA.id)).rejects.toThrow(
      ForbiddenError
    )
  })

  it('customer cannot list members', async () => {
    await expect(projectMembershipService.listMembers(w.customer1, w.projectA.id)).rejects.toThrow(
      ForbiddenError
    )
  })
})
