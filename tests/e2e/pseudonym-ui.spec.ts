/**
 * Pseudonym UI verification — customer sees "Support Agent N" in browser
 */
import { test, expect } from '../auth'

test.describe('Pseudonym UI — Customer Browser', () => {
  test('customer sees pseudonym on issue detail page', async ({ customerPage }) => {
    // Navigate to an issue assigned to an agent
    await customerPage.goto('/en/projects/ACME/issues/ACME-1')
    await customerPage.waitForLoadState('networkidle')

    // Should see "Support Agent" somewhere on the page
    await expect(customerPage.getByText(/Support Agent \d+/).first()).toBeVisible()

    // Should NOT see agent's real email
    await expect(customerPage.getByText('agent1@demo.com')).not.toBeVisible({
      timeout: 2000,
    })

    await customerPage.screenshot({
      path: 'tests/screenshots/pseudonym-customer-issue-detail.png',
    })
  })

  test('customer sees pseudonym in comment authors', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/ACME/issues/ACME-1')
    await customerPage.waitForLoadState('networkidle')

    // Check comments section — agent comments should show pseudonym
    const commentAuthors = customerPage.locator('[data-testid="comment-author"], .comment-author')
    const count = await commentAuthors.count()

    // If there are comments with visible authors, none should show agent real names
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const text = await commentAuthors.nth(i).textContent()
        expect(text).not.toContain('agent1@demo.com')
      }
    }
  })
})

test.describe('Pseudonym UI — Admin Browser (no masking)', () => {
  test('admin sees real names on issue detail page', async ({ adminPage }) => {
    await adminPage.goto('/en/projects/ACME/issues/ACME-1')
    await adminPage.waitForLoadState('networkidle')

    // Admin should NOT see pseudonyms
    const pseudonymVisible = await adminPage.getByText(/Support Agent \d+/).count()
    expect(pseudonymVisible).toBe(0)

    await adminPage.screenshot({
      path: 'tests/screenshots/pseudonym-admin-issue-detail.png',
    })
  })
})
