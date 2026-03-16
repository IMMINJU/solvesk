/**
 * Security: Agent Isolation & Permission Tests
 *
 * agent1 (agent1@demo.com) — assigned to ACME + GLX
 * agent2 (agent2@demo.com) — assigned to ACME only
 *
 * Tests verify:
 * 1. Agent can only see assigned projects
 * 2. Agent cannot access unassigned projects
 * 3. Agent can perform staff actions (status, priority, assign)
 * 4. Agent cannot perform admin-only actions (user CRUD, project CRUD, issue delete)
 */
import { test, expect } from '../auth'

// ─── 1. Project Isolation ─────────────────────────────────

test.describe('Agent: Project Isolation', () => {
  test('agent1 sees both assigned projects (ACME + GLX)', async ({ agentPage }) => {
    await agentPage.goto('/en/projects')
    await expect(agentPage.getByText('Acme Corp').first()).toBeVisible()
    await expect(agentPage.getByText('Globex Inc').first()).toBeVisible()
  })

  test('agent2 sees only ACME project', async ({ agent2Page }) => {
    await agent2Page.goto('/en/projects')
    await expect(agent2Page.getByText('Acme Corp').first()).toBeVisible()
    await expect(agent2Page.getByText('Globex Inc')).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('agent2 cannot access GLX project page', async ({ agent2Page }) => {
    await agent2Page.goto('/en/projects/GLX')
    // Should not show GLX project content
    await expect(agent2Page.getByRole('heading', { name: 'Globex Inc' })).not.toBeVisible({
      timeout: 5000,
    })
  })

  test('agent2 cannot access GLX issues via API', async ({ agent2Context }) => {
    const res = await agent2Context.request.get('/api/issues/GLX-1')
    expect(res.status()).toBe(403)
  })

  test('agent2 project list API returns only ACME', async ({ agent2Context }) => {
    const projectsRes = await agent2Context.request.get('/api/projects')
    const projects = await projectsRes.json()
    const projectCodes = projects.map((p: { code: string }) => p.code)
    expect(projectCodes).toContain('ACME')
    expect(projectCodes).not.toContain('GLX')
  })
})

// ─── 2. Issue Access Isolation ────────────────────────────

test.describe('Agent: Issue Access Isolation', () => {
  test('agent1 sees issues from both projects in All Issues', async ({ agentPage }) => {
    await agentPage.goto('/en/issues')
    await expect(agentPage.getByText('ACME-1').first()).toBeVisible()
    await expect(agentPage.getByText('GLX-1').first()).toBeVisible()
  })

  test('agent2 sees only ACME issues in All Issues', async ({ agent2Page }) => {
    await agent2Page.goto('/en/issues')
    await expect(agent2Page.getByText('ACME-1').first()).toBeVisible()
    await expect(agent2Page.getByText('GLX-1')).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('agent2 can access ACME issue detail', async ({ agent2Page }) => {
    await agent2Page.goto('/en/projects/ACME/issues/ACME-1')
    await expect(agent2Page.getByText('Status')).toBeVisible({
      timeout: 10000,
    })
  })

  test('agent2 cannot access GLX issue detail page', async ({ agent2Page }) => {
    await agent2Page.goto('/en/projects/GLX/issues/GLX-1')
    await expect(agent2Page.getByText('Status')).not.toBeVisible({
      timeout: 5000,
    })
  })
})

// ─── 3. Agent Staff Permissions (can do) ──────────────────

test.describe('Agent: Staff Permissions', () => {
  test('agent can change issue status via API', async ({ agentContext }) => {
    const res = await agentContext.request.patch('/api/issues/ACME-3/status', {
      data: { status: 'in_progress' },
    })
    expect(res.ok()).toBe(true)

    // Restore
    await agentContext.request.patch('/api/issues/ACME-3/status', {
      data: { status: 'open' },
    })
  })

  test('agent can change issue priority via API', async ({ agentContext }) => {
    const res = await agentContext.request.patch('/api/issues/ACME-3/priority', {
      data: { priority: 'high' },
    })
    expect(res.ok()).toBe(true)

    // Restore
    await agentContext.request.patch('/api/issues/ACME-3/priority', {
      data: { priority: 'medium' },
    })
  })

  test('agent can assign and unassign issue via API', async ({ agentContext }) => {
    // Get ACME-3 to find a valid user ID (the reporter)
    const issueRes = await agentContext.request.get('/api/issues/ACME-3')
    expect(issueRes.ok()).toBe(true)
    const issue = await issueRes.json()

    const res = await agentContext.request.patch('/api/issues/ACME-3/assign', {
      data: { assigneeId: issue.reporter?.id ?? issue.reporterId },
    })
    expect(res.ok()).toBe(true)

    // Unassign
    const unassignRes = await agentContext.request.patch('/api/issues/ACME-3/assign', {
      data: { assigneeId: null },
    })
    expect(unassignRes.ok()).toBe(true)
  })

  test('agent can create a comment', async ({ agentContext }) => {
    const res = await agentContext.request.post('/api/issues/ACME-3/comments', {
      data: { content: '<p>Agent test comment</p>', isInternal: false },
    })
    expect(res.ok()).toBe(true)
  })

  test('agent can create internal comments', async ({ agentContext }) => {
    const res = await agentContext.request.post('/api/issues/ACME-3/comments', {
      data: { content: '<p>Internal agent note</p>', isInternal: true },
    })
    expect(res.ok()).toBe(true)
  })

  test('agent can see internal comments', async ({ agentPage }) => {
    await agentPage.goto('/en/projects/ACME/issues/ACME-1')
    await agentPage.waitForLoadState('networkidle')

    await expect(agentPage.getByText('Internal').first()).toBeVisible({
      timeout: 10000,
    })
  })
})

// ─── 4. Agent Admin-Only Restrictions (cannot do) ─────────

test.describe('Agent: Admin-Only Restrictions', () => {
  test('agent cannot access users page', async ({ agentPage }) => {
    await agentPage.goto('/en/users')
    // Should redirect or show forbidden
    await expect(agentPage.getByRole('heading', { name: 'Users' })).not.toBeVisible({
      timeout: 5000,
    })
  })

  test('agent cannot create users via API', async ({ agentContext }) => {
    const res = await agentContext.request.post('/api/users', {
      data: {
        name: 'Hacker',
        email: 'hacker@test.com',
        password: 'Test1234!',
        role: 'agent',
      },
    })
    expect(res.status()).toBe(403)
  })

  test('agent cannot delete users via API', async ({ agentContext }) => {
    const res = await agentContext.request.delete('/api/users/00000000-0000-0000-0000-000000000000')
    expect(res.status()).toBe(403)
  })

  test('agent cannot create projects via API', async ({ agentContext }) => {
    const res = await agentContext.request.post('/api/projects', {
      data: { name: 'Hacker Project', code: 'HACK', description: '' },
    })
    expect(res.status()).toBe(403)
  })

  test('agent cannot delete projects via API', async ({ agentContext }) => {
    const res = await agentContext.request.delete('/api/projects/1')
    expect(res.status()).toBe(403)
  })

  test('agent cannot delete issues via API', async ({ agentContext }) => {
    const res = await agentContext.request.delete('/api/issues/ACME-3')
    expect(res.status()).toBe(403)
  })
})

// ─── 5. Cross-Agent Isolation ─────────────────────────────

test.describe('Agent: Cross-Agent Isolation', () => {
  test('agent2 cannot modify GLX issue status', async ({ agent2Context }) => {
    const res = await agent2Context.request.patch('/api/issues/GLX-1/status', {
      data: { status: 'in_progress' },
    })
    expect(res.status()).toBe(403)
  })

  test('agent2 cannot modify GLX issue priority', async ({ agent2Context }) => {
    const res = await agent2Context.request.patch('/api/issues/GLX-1/priority', {
      data: { priority: 'urgent' },
    })
    expect(res.status()).toBe(403)
  })

  test('agent2 cannot comment on GLX issues', async ({ agent2Context }) => {
    const res = await agent2Context.request.post('/api/issues/GLX-1/comments', {
      data: { content: '<p>Unauthorized comment</p>', isInternal: false },
    })
    expect(res.status()).toBe(403)
  })
})
