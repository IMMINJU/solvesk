/**
 * E2E: Dashboard page (/dashboard)
 */
import { test, expect } from '../auth'

test.describe('Dashboard', () => {
  test('admin sees dashboard page with stats', async ({ adminPage }) => {
    await adminPage.goto('/en/dashboard')
    await expect(adminPage).toHaveURL(/\/en\/dashboard/)
    await expect(adminPage).not.toHaveURL(/signin/)

    // Dashboard should show stat cards (issues, projects, etc.)
    await expect(adminPage.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })

  test('agent can access dashboard', async ({ agentPage }) => {
    await agentPage.goto('/en/dashboard')
    await expect(agentPage).toHaveURL(/\/en\/dashboard/)
    await expect(agentPage).not.toHaveURL(/signin/)
  })

  test('customer can access dashboard', async ({ customerPage }) => {
    await customerPage.goto('/en/dashboard')
    await expect(customerPage).toHaveURL(/\/en\/dashboard/)
    await expect(customerPage).not.toHaveURL(/signin/)
  })

  test('page loads without errors', async ({ adminPage }) => {
    const errors: string[] = []
    adminPage.on('pageerror', err => errors.push(err.message))

    await adminPage.goto('/en/dashboard')
    await adminPage.waitForLoadState('networkidle')

    expect(errors).toHaveLength(0)
  })
})
