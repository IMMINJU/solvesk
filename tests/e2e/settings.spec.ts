/**
 * E2E: Settings page (/settings)
 */
import { test, expect } from '../auth'

test.describe('Settings Page', () => {
  test('admin can access settings page', async ({ adminPage }) => {
    await adminPage.goto('/en/settings')

    await expect(adminPage.getByRole('heading', { name: 'Settings' })).toBeVisible()

    // Profile section
    await expect(adminPage.getByRole('heading', { name: 'Profile' })).toBeVisible()

    // Security section
    await expect(adminPage.getByRole('heading', { name: 'Security' })).toBeVisible()
  })

  test('shows current user name in profile form', async ({ adminPage }) => {
    await adminPage.goto('/en/settings')

    // Name input should have current user name
    const nameInput = adminPage.locator('#profile-name')
    await expect(nameInput).toBeVisible()
    await expect(nameInput).toHaveValue(/\w+/)
  })

  test('shows email as read-only', async ({ adminPage }) => {
    await adminPage.goto('/en/settings')

    // Email input should be disabled
    const emailInput = adminPage.locator('input[disabled][value*="@"]')
    await expect(emailInput).toBeVisible()
  })

  test('password form has all fields', async ({ adminPage }) => {
    await adminPage.goto('/en/settings')

    await expect(adminPage.locator('#current-password')).toBeVisible()
    await expect(adminPage.locator('#new-password')).toBeVisible()
    await expect(adminPage.locator('#confirm-password')).toBeVisible()
  })

  test('customer can access settings page', async ({ customerPage }) => {
    await customerPage.goto('/en/settings')

    await expect(customerPage.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })
})
