/**
 * E2E: Onboarding API (/api/onboarding)
 * Note: DB has seeded users, so onboarding should report needsOnboarding=false
 */
import { test, expect } from '@playwright/test'

test.describe('Onboarding API', () => {
  test('GET returns needsOnboarding=false when users exist', async ({ request }) => {
    const res = await request.get('/api/onboarding')
    expect(res.ok()).toBe(true)
    const data = await res.json()
    expect(data.needsOnboarding).toBe(false)
  })

  test('POST returns 400 when users already exist', async ({ request }) => {
    const res = await request.post('/api/onboarding', {
      data: {
        name: 'Test Admin',
        email: 'test@example.com',
        password: 'password123',
      },
    })
    expect(res.status()).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Onboarding already completed')
  })

  test('onboarding page redirects to signin when users exist', async ({ page }) => {
    await page.goto('/en/auth/onboarding')
    // Should redirect to signin since users exist
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 })
    expect(page.url()).toContain('/auth/signin')
  })
})
