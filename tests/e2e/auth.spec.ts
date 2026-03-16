/**
 * E2E: Authentication flows
 */
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.use({ storageState: { cookies: [], origins: [] } }) // No auth

  test('renders sign in form', async ({ page }) => {
    await page.goto('/en/auth/signin')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/en/auth/signin')
    await page.fill('#email', 'admin@demo.com')
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    await expect(page).toHaveURL(/\/en\/dashboard/)
  })

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/en/auth/signin')
    await page.fill('#email', 'admin@demo.com')
    await page.fill('#password', 'wrongpassword')
    await page.click('button[type="submit"]')
    // Should stay on signin page
    await expect(page).toHaveURL(/signin/, { timeout: 5000 })
  })

  test('unauthenticated user is redirected to signin', async ({ page }) => {
    await page.goto('/en/dashboard')
    await expect(page).toHaveURL(/signin/)
  })
})
