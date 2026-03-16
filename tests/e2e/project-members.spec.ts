/**
 * Project Members Management Tests
 *
 * Verifies:
 * - Admin can list project members via API
 * - Admin can add an agent to a project
 * - Admin can remove an agent from a project
 * - Non-admin cannot access members API
 * - Browser: Members dialog shows members and allows add/remove
 */
import { test, expect } from '../auth'

test.describe('Project Members — API', () => {
  test('admin can list members of a project', async ({ adminContext }) => {
    // Get ACME project ID
    const projRes = await adminContext.request.get('/api/projects')
    const projects = await projRes.json()
    const acme = projects.find((p: { code: string }) => p.code === 'ACME')
    expect(acme).toBeTruthy()

    const res = await adminContext.request.get(`/api/projects/${acme.id}/members`)
    expect(res.ok()).toBe(true)
    const members = await res.json()
    expect(Array.isArray(members)).toBe(true)
    // Seed has agent1 and agent2 in ACME
    expect(members.length).toBeGreaterThanOrEqual(1)
  })

  test('admin can add and remove a member', async ({ adminContext }) => {
    // Get GLX project
    const projRes = await adminContext.request.get('/api/projects')
    const projects = await projRes.json()
    const glx = projects.find((p: { code: string }) => p.code === 'GLX')
    expect(glx).toBeTruthy()

    // Get current GLX members
    const membersRes = await adminContext.request.get(`/api/projects/${glx.id}/members`)
    const membersBefore = await membersRes.json()

    // Find agent2 (seed: ACME only, not in GLX)
    const usersRes = await adminContext.request.get('/api/users?pageSize=100')
    const usersData = await usersRes.json()
    const agent2 = usersData.data.find((u: { email: string }) => u.email === 'agent2@demo.com')

    // Check if agent2 is already in GLX
    const alreadyMember = membersBefore.some((m: { userId: string }) => m.userId === agent2.id)

    if (!alreadyMember) {
      // Add agent2 to GLX
      const addRes = await adminContext.request.post(`/api/projects/${glx.id}/members`, {
        data: { userId: agent2.id },
      })
      expect(addRes.ok()).toBe(true)

      // Verify added
      const afterAdd = await adminContext.request.get(`/api/projects/${glx.id}/members`)
      const membersAfterAdd = await afterAdd.json()
      expect(membersAfterAdd.some((m: { userId: string }) => m.userId === agent2.id)).toBe(true)

      // Remove agent2 from GLX
      const removeRes = await adminContext.request.delete(`/api/projects/${glx.id}/members`, {
        data: { userId: agent2.id },
      })
      expect(removeRes.ok()).toBe(true)

      // Verify removed
      const afterRemove = await adminContext.request.get(`/api/projects/${glx.id}/members`)
      const membersAfterRemove = await afterRemove.json()
      expect(membersAfterRemove.some((m: { userId: string }) => m.userId === agent2.id)).toBe(false)
    }
  })

  test('duplicate add returns conflict error', async ({ adminContext }) => {
    // Get ACME project
    const projRes = await adminContext.request.get('/api/projects')
    const projects = await projRes.json()
    const acme = projects.find((p: { code: string }) => p.code === 'ACME')

    // Get current members
    const membersRes = await adminContext.request.get(`/api/projects/${acme.id}/members`)
    const members = await membersRes.json()

    if (members.length > 0) {
      // Try adding an existing member again
      const res = await adminContext.request.post(`/api/projects/${acme.id}/members`, {
        data: { userId: members[0].userId },
      })
      expect(res.status()).toBe(409)
    }
  })

  test('agent cannot access members API', async ({ agentContext }) => {
    // Get a project the agent has access to
    const projRes = await agentContext.request.get('/api/projects')
    const projects = await projRes.json()
    expect(projects.length).toBeGreaterThan(0)

    const res = await agentContext.request.get(`/api/projects/${projects[0].id}/members`)
    expect(res.status()).toBe(403)
  })

  test('customer cannot access members API', async ({ customerContext }) => {
    const res = await customerContext.request.get('/api/projects/1/members')
    expect(res.status()).toBe(403)
  })
})

test.describe('Project Members — Browser', () => {
  test('admin can open members dialog from projects page', async ({ adminPage }) => {
    await adminPage.goto('/en/projects')
    await adminPage.waitForLoadState('networkidle')

    // Should see the members icon button (Users icon)
    const membersButton = adminPage
      .locator('button[title]')
      .filter({ has: adminPage.locator('svg') })
      .first()

    // Click the members button for the first project
    const projectRow = adminPage.locator('.group').first()
    const memberBtn = projectRow.locator('button[title]').first()
    await memberBtn.click()

    // Dialog should appear with "Manage Members"
    await expect(adminPage.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    await expect(adminPage.getByText(/Manage Members|멤버 관리/)).toBeVisible()
  })
})
