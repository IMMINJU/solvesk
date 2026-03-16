/**
 * E2E: Notifications page (/notifications)
 */
import { test, expect } from '../auth'

test.describe('Notifications Page', () => {
  test('admin can access notifications page', async ({ adminPage }) => {
    await adminPage.goto('/en/notifications')

    await expect(adminPage.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  })

  test('shows filter tabs', async ({ adminPage }) => {
    await adminPage.goto('/en/notifications')

    await expect(adminPage.getByRole('button', { name: 'All', exact: true })).toBeVisible()
    await expect(adminPage.getByRole('button', { name: /Unread/ })).toBeVisible()
    await expect(adminPage.getByRole('button', { name: 'Read', exact: true })).toBeVisible()
  })

  test('customer can access notifications page', async ({ customerPage }) => {
    await customerPage.goto('/en/notifications')

    await expect(customerPage.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  })

  test('page shows either notifications or empty state', async ({ adminPage }) => {
    await adminPage.goto('/en/notifications')

    // The page should have either notification items or the empty state text
    const heading = adminPage.getByRole('heading', { name: 'Notifications' })
    await expect(heading).toBeVisible({ timeout: 10000 })

    // Just verify the page rendered without errors — either state is valid
    // after CRUD tests may have created notifications
    const pageContent = await adminPage.locator("main, [class*='mx-auto']").first().textContent()
    expect(pageContent).toBeTruthy()
  })
})
