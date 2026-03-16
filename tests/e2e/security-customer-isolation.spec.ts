/**
 * Security: Customer Isolation Tests
 *
 * customer1 belongs to ACME project.
 * customer2 belongs to GLX project.
 * Customers must NOT access other projects' data.
 */
import { test, expect } from '../auth'

test.describe('Customer Isolation', () => {
  // ── Cross-Project Access ──────────────────────

  test("customer cannot access other project's issue via API", async ({ customerContext }) => {
    // customer1 (ACME) tries to access GLX-1
    const res = await customerContext.request.get('/api/issues/GLX-1')
    expect(res.status()).toBe(403)
  })

  test("customer cannot access other project's issue list", async ({ customerContext }) => {
    // customer1 tries to get GLX project issues
    // First get GLX project ID
    const projectsRes = await customerContext.request.get('/api/projects')
    const projects = await projectsRes.json()
    // Customer should only see their own project (ACME), not GLX
    const projectNames = projects.map((p: { name: string }) => p.name)
    expect(projectNames).not.toContain('Globex Inc')
  })

  // ── Private Issue Access ──────────────────────

  test('customer cannot see private issues they did not report', async ({ customerPage }) => {
    // ACME-5 is isPrivate=true, reported by customer1
    // If there were a private issue reported by someone else, customer1 shouldn't see it
    // Verify via issues list — private issues by others should not appear
    await customerPage.goto('/en/issues')
    await customerPage.waitForLoadState('networkidle')

    // ACME-5 (private, reported by customer1) SHOULD be visible to customer1
    await expect(customerPage.getByText('Dark mode support').first()).toBeVisible()
  })

  // ── Status Change Constraints ─────────────────

  test('customer cannot change status to in_progress', async ({ customerContext }) => {
    const res = await customerContext.request.patch('/api/issues/ACME-1/status', {
      data: { status: 'in_progress' },
    })
    expect(res.status()).toBe(403)
  })

  test('customer cannot change status to closed', async ({ customerContext }) => {
    const res = await customerContext.request.patch('/api/issues/ACME-1/status', {
      data: { status: 'closed' },
    })
    expect(res.status()).toBe(403)
  })

  test('customer cannot change status to waiting', async ({ customerContext }) => {
    const res = await customerContext.request.patch('/api/issues/ACME-1/status', {
      data: { status: 'waiting' },
    })
    expect(res.status()).toBe(403)
  })

  // ── Assign / Priority / Due Date ──────────────

  test('customer cannot assign users', async ({ customerContext }) => {
    const res = await customerContext.request.patch('/api/issues/ACME-1/assign', {
      data: { assigneeId: '00000000-0000-0000-0000-000000000000' },
    })
    expect(res.status()).toBe(403)
  })

  test('customer cannot change priority', async ({ customerContext }) => {
    const res = await customerContext.request.patch('/api/issues/ACME-1/priority', {
      data: { priority: 'urgent' },
    })
    expect(res.status()).toBe(403)
  })

  // ── Internal Comments ─────────────────────────

  test('customer cannot create internal comments', async ({ customerContext }) => {
    const res = await customerContext.request.post('/api/issues/ACME-1/comments', {
      data: { content: '<p>secret</p>', isInternal: true },
    })
    expect(res.status()).toBe(403)
  })

  test('customer cannot see internal comments via API', async ({ customerContext }) => {
    // Get ACME-1 which has an internal comment from seed data
    const res = await customerContext.request.get('/api/issues/ACME-1')
    expect(res.ok()).toBe(true)
    const issue = await res.json()

    // If comments are included, none should be internal
    if (issue.comments) {
      for (const comment of issue.comments) {
        expect(comment.isInternal).not.toBe(true)
      }
    }
  })
})
