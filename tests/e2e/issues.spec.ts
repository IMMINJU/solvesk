/**
 * E2E: Issues pages (/issues, /projects/[code]/issues/[key])
 */
import { test, expect } from '../auth'

test.describe('All Issues', () => {
  test('admin sees issues from all projects', async ({ adminPage }) => {
    await adminPage.goto('/en/issues')

    await expect(adminPage.getByRole('heading', { name: 'All Issues' })).toBeVisible()

    // ACME and GLX issues exist
    await expect(adminPage.getByText('ACME-1').first()).toBeVisible()
    await expect(adminPage.getByText('GLX-1').first()).toBeVisible()
  })

  test('can navigate to project issues from issue row', async ({ adminPage }) => {
    await adminPage.goto('/en/issues')
    // Use exact match to avoid ACME-1 matching ACME-10, ACME-11, etc.
    await adminPage.getByText('ACME-1', { exact: true }).first().click()
    await adminPage.waitForURL(/\/projects\/ACME\/issues\/ACME-1$/)
    // Just verify we're on a detail page with sidebar controls
    await expect(adminPage.getByText('Status')).toBeVisible()
  })

  test('status filter works', async ({ adminPage }) => {
    await adminPage.goto('/en/issues')

    await adminPage.getByRole('button', { name: 'Resolved' }).click()
    // ACME-4 is resolved in seed
    await expect(adminPage.getByText('ACME-4').first()).toBeVisible()
  })
})

test.describe('Issue Detail', () => {
  test('shows title, status, priority, and comments section', async ({ adminPage }) => {
    // Use ACME-3 which is less likely to be modified by CRUD tests
    await adminPage.goto('/en/projects/ACME/issues/ACME-3')

    // Sidebar controls visible
    await expect(adminPage.getByText('Status')).toBeVisible({ timeout: 10000 })
    await expect(adminPage.getByText('Priority')).toBeVisible()
    await expect(adminPage.getByText('Assignee')).toBeVisible()
    await expect(adminPage.getByText('Comments')).toBeVisible()
  })

  test('admin sees internal comments', async ({ adminPage }) => {
    // Use ACME-1 — seed has internal comments
    await adminPage.goto('/en/projects/ACME/issues/ACME-1')
    await adminPage.waitForLoadState('networkidle')

    // Check for the Internal badge rather than specific text
    // (CRUD tests may modify comments on ACME-1)
    await expect(adminPage.getByText('Internal').first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('customer cannot see internal comments', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/ACME/issues/ACME-1')
    await customerPage.waitForLoadState('networkidle')

    // Internal badge should NOT be visible to customer
    await expect(customerPage.getByText('Internal').first()).not.toBeVisible({ timeout: 5000 })
  })

  test('customer cannot access other project issues', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/GLX/issues/GLX-1')

    // Should be forbidden/redirected — no issue content visible
    await expect(customerPage.getByText('Status')).not.toBeVisible({ timeout: 5000 })
  })
})
