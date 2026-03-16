/**
 * E2E: Mobile viewport checks
 */
import { test, expect } from '../auth'

test.use({ viewport: { width: 375, height: 667 } })

test.describe('Mobile - All Issues', () => {
  test("filter bar doesn't overflow", async ({ adminPage }) => {
    await adminPage.goto('/en/issues')
    await expect(adminPage.getByRole('heading', { name: 'All Issues' })).toBeVisible()

    // Page should not have horizontal scrollbar
    const bodyWidth = await adminPage.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await adminPage.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1)
  })

  test('issue list is readable', async ({ adminPage }) => {
    await adminPage.goto('/en/issues')
    // Issues should be visible (not cut off)
    // Mobile card is the last matching element (desktop table is hidden)
    await expect(adminPage.getByText('ACME-1').last()).toBeVisible()
  })
})

test.describe('Mobile - Project Detail', () => {
  test('page renders without horizontal overflow', async ({ adminPage }) => {
    await adminPage.goto('/en/projects/ACME')
    await expect(adminPage.getByRole('heading', { name: 'Acme Corp' })).toBeVisible()

    const bodyWidth = await adminPage.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await adminPage.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1)
  })
})
