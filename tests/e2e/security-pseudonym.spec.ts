/**
 * Security: Pseudonym (Agent Name Masking) Tests
 *
 * Customer users should see "Support Agent N" instead of real staff names.
 * Customer's own info should remain unchanged.
 * Admin/Agent users should see real names.
 */
import { test, expect } from '../auth'

test.describe('Pseudonym — Customer View', () => {
  test('customer sees pseudonym for assignee in issue detail API', async ({ customerContext }) => {
    const res = await customerContext.request.get('/api/issues/ACME-1')
    expect(res.ok()).toBe(true)
    const issue = await res.json()

    // Assignee should be masked (not a customer)
    if (issue.assignee) {
      expect(issue.assignee.name).toMatch(/^Support Agent \d+$/)
      expect(issue.assignee.email).toBeUndefined()
      expect(issue.assignee.image).toBeNull()
    }
  })

  test('customer sees pseudonym for comment authors in issue detail API', async ({
    customerContext,
  }) => {
    const res = await customerContext.request.get('/api/issues/ACME-1')
    const issue = await res.json()

    // Non-customer comment authors should be masked
    if (issue.comments && issue.comments.length > 0) {
      for (const comment of issue.comments) {
        if (comment.author && comment.author.id !== issue.reporter?.id) {
          // Staff authors should have pseudonym
          expect(comment.author.name).toMatch(/^Support Agent \d+$/)
        }
      }
    }
  })

  test("customer's own name is preserved", async ({ customerContext }) => {
    const res = await customerContext.request.get('/api/issues/ACME-1')
    const issue = await res.json()

    // Reporter (customer1) should keep their real name
    if (issue.reporter) {
      expect(issue.reporter.name).not.toMatch(/^Support Agent \d+$/)
    }
  })

  test('customer sees pseudonyms in issue list API', async ({ customerContext }) => {
    const res = await customerContext.request.get('/api/issues')
    expect(res.ok()).toBe(true)
    const data = await res.json()

    for (const issue of data.data) {
      // If assignee exists and is staff, should be masked
      if (issue.assignee && issue.assignee.name) {
        // Either it's the customer's own name or a pseudonym
        const isPseudonym = /^Support Agent \d+$/.test(issue.assignee.name)
        const isCustomerOwn = issue.reporter?.id === issue.assignee?.id
        expect(isPseudonym || isCustomerOwn).toBe(true)
      }
    }
  })

  test('customer sees no staff emails in project users API', async ({ customerContext }) => {
    // Get customer's project ID first
    const profileRes = await customerContext.request.get('/api/profile')
    const profile = await profileRes.json()
    const projectId = profile.projectId

    if (projectId) {
      const res = await customerContext.request.get(`/api/projects/${projectId}/users`)
      expect(res.ok()).toBe(true)
      const users = await res.json()

      for (const u of users) {
        if (u.role !== 'customer') {
          // Staff should have pseudonym
          expect(u.name).toMatch(/^Support Agent \d+$/)
          expect(u.email).toBeUndefined()
          expect(u.image).toBeNull()
        }
      }
    }
  })
})

test.describe('Pseudonym — Staff View (no masking)', () => {
  test('admin sees real names in issue detail', async ({ adminContext }) => {
    const res = await adminContext.request.get('/api/issues/ACME-1')
    const issue = await res.json()

    if (issue.assignee) {
      expect(issue.assignee.name).not.toMatch(/^Support Agent \d+$/)
      // Email should be present
      expect(issue.assignee.email).toBeTruthy()
    }
  })

  test('agent sees real names in issue detail', async ({ agentContext }) => {
    const res = await agentContext.request.get('/api/issues/ACME-1')
    const issue = await res.json()

    if (issue.assignee) {
      expect(issue.assignee.name).not.toMatch(/^Support Agent \d+$/)
      expect(issue.assignee.email).toBeTruthy()
    }
  })
})
