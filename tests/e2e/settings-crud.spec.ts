/**
 * E2E: Settings page — profile update and password change flows
 */
import { test, expect } from '../auth'

const UNIQUE = Date.now().toString(36)

// ─── 1. Update profile name ────────────────────────────────────

test.describe('Settings: Update Profile', () => {
  const TEMP_NAME = `E2E Admin ${UNIQUE}`

  test('can update profile name and see success toast', async ({ adminPage }) => {
    await adminPage.goto('/en/settings')
    await expect(adminPage.getByRole('heading', { name: 'Settings' })).toBeVisible({
      timeout: 10000,
    })

    const nameInput = adminPage.locator('#profile-name')
    await expect(nameInput).toBeVisible({ timeout: 5000 })

    // Store original
    const originalName = await nameInput.inputValue()

    // Update name
    await nameInput.clear()
    await nameInput.fill(TEMP_NAME)

    // Click the Save button that's a sibling of the name input (inside the same form)
    // The profile section has its own form with a Save button
    await adminPage
      .locator('form')
      .filter({ has: adminPage.locator('#profile-name') })
      .getByRole('button', { name: /Save/i })
      .click()

    // Wait for success toast
    await expect(adminPage.getByText('Profile updated successfully')).toBeVisible({
      timeout: 10000,
    })

    // Verify via API that the name was saved
    const res = await adminPage.request.get('/api/profile')
    const profile = await res.json()
    expect(profile.name).toBe(TEMP_NAME)

    // Restore original name via API
    await adminPage.request.patch('/api/profile', {
      data: { name: originalName },
    })
  })
})

// ─── 2. Change password (success) ──────────────────────────────

test.describe('Settings: Change Password', () => {
  const CURRENT_PASSWORD = 'password123'
  const NEW_PASSWORD = `NewPass${UNIQUE}!`

  test('can change password successfully', async ({ agentPage }) => {
    await agentPage.goto('/en/settings')
    await expect(agentPage.getByRole('heading', { name: 'Settings' })).toBeVisible({
      timeout: 10000,
    })

    await agentPage.locator('#current-password').fill(CURRENT_PASSWORD)
    await agentPage.locator('#new-password').fill(NEW_PASSWORD)
    await agentPage.locator('#confirm-password').fill(NEW_PASSWORD)

    // Click "Change Password" button in the password form
    await agentPage
      .locator('form')
      .filter({ has: agentPage.locator('#current-password') })
      .getByRole('button', { name: /Change Password/i })
      .click()

    await expect(agentPage.getByText('Password changed successfully')).toBeVisible({
      timeout: 10000,
    })

    // Restore original password
    await agentPage.locator('#current-password').fill(NEW_PASSWORD)
    await agentPage.locator('#new-password').fill(CURRENT_PASSWORD)
    await agentPage.locator('#confirm-password').fill(CURRENT_PASSWORD)
    await agentPage
      .locator('form')
      .filter({ has: agentPage.locator('#current-password') })
      .getByRole('button', { name: /Change Password/i })
      .click()

    await expect(agentPage.getByText('Password changed successfully')).toBeVisible({
      timeout: 10000,
    })
  })
})

// ─── 3. Change password with wrong current password ─────────────

test.describe('Settings: Change Password Error', () => {
  test('shows error with wrong current password', async ({ adminPage }) => {
    await adminPage.goto('/en/settings')
    await expect(adminPage.getByRole('heading', { name: 'Settings' })).toBeVisible({
      timeout: 10000,
    })

    await adminPage.locator('#current-password').fill('WrongPassword999!')
    await adminPage.locator('#new-password').fill('ValidNewPass123!')
    await adminPage.locator('#confirm-password').fill('ValidNewPass123!')

    await adminPage
      .locator('form')
      .filter({ has: adminPage.locator('#current-password') })
      .getByRole('button', { name: /Change Password/i })
      .click()

    // Error toast
    await expect(adminPage.locator("[data-sonner-toast][data-type='error']").first()).toBeVisible({
      timeout: 10000,
    })
  })
})
