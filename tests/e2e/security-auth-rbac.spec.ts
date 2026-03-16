/**
 * Security: Authentication & RBAC Tests
 *
 * - Unauthenticated requests must return 401
 * - Admin-only endpoints must return 403 for agent/customer
 * - Comment ownership enforcement
 */
import { test, expect } from '../auth'
// ── Unauthenticated Access ──────────────────────

test.describe('Unauthenticated API Access', () => {
  // Use a fresh browser context with NO stored auth
  const endpoints = [
    { method: 'GET' as const, url: '/api/issues' },
    { method: 'GET' as const, url: '/api/users' },
    { method: 'GET' as const, url: '/api/projects' },
    { method: 'GET' as const, url: '/api/notifications' },
    { method: 'GET' as const, url: '/api/dashboard/stats' },
  ]

  for (const { method, url } of endpoints) {
    test(`${method} ${url} returns 401 without auth`, async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const res = await context.request.get(url)
      expect(res.status()).toBe(401)
      await context.close()
    })
  }

  test('POST /api/issues returns 401 without auth', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    })
    const res = await context.request.post('/api/issues', {
      data: { title: 'test', projectId: 1 },
    })
    expect(res.status()).toBe(401)
    await context.close()
  })
})

// ── Admin-Only Endpoints ────────────────────────

test.describe('Admin-Only Endpoints', () => {
  test('agent cannot list users', async ({ agentContext }) => {
    const res = await agentContext.request.get('/api/users')
    expect(res.status()).toBe(403)
  })

  test('customer cannot list users', async ({ customerContext }) => {
    const res = await customerContext.request.get('/api/users')
    expect(res.status()).toBe(403)
  })

  test('agent cannot create users', async ({ agentContext }) => {
    const res = await agentContext.request.post('/api/users', {
      data: {
        name: 'Hacker',
        email: 'hacker@test.com',
        password: 'password123',
        role: 'admin',
      },
    })
    expect(res.status()).toBe(403)
  })

  test('customer cannot create users', async ({ customerContext }) => {
    const res = await customerContext.request.post('/api/users', {
      data: {
        name: 'Hacker',
        email: 'hacker@test.com',
        password: 'password123',
        role: 'admin',
      },
    })
    expect(res.status()).toBe(403)
  })
})

// ── Comment Ownership ───────────────────────────

test.describe('Comment Ownership', () => {
  test("user cannot edit another user's comment", async ({ customerContext, adminContext }) => {
    // Get ACME-1 comments (has comments from agent1)
    const issueRes = await adminContext.request.get('/api/issues/ACME-1')
    const issue = await issueRes.json()
    const agentComment = issue.comments?.find((c: { isInternal: boolean }) => !c.isInternal)

    if (agentComment) {
      // customer1 tries to edit agent1's comment
      const res = await customerContext.request.patch(`/api/comments/${agentComment.id}`, {
        data: { content: '<p>hacked</p>' },
      })
      expect(res.status()).toBe(403)
    }
  })

  test("user cannot delete another user's comment (non-admin)", async ({
    customerContext,
    adminContext,
  }) => {
    const issueRes = await adminContext.request.get('/api/issues/ACME-1')
    const issue = await issueRes.json()
    const agentComment = issue.comments?.find((c: { isInternal: boolean }) => !c.isInternal)

    if (agentComment) {
      // customer1 tries to delete agent1's comment
      const res = await customerContext.request.delete(`/api/comments/${agentComment.id}`)
      expect(res.status()).toBe(403)
    }
  })
})

// ── Issue Delete (Admin Only) ───────────────────

test.describe('Issue Delete Authorization', () => {
  test('agent cannot delete issues', async ({ agentContext }) => {
    const res = await agentContext.request.delete('/api/issues/ACME-1')
    expect(res.status()).toBe(403)
  })

  test('customer cannot delete issues', async ({ customerContext }) => {
    const res = await customerContext.request.delete('/api/issues/ACME-1')
    expect(res.status()).toBe(403)
  })
})
