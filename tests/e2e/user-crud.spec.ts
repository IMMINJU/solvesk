/**
 * E2E: User CRUD — create, edit, reset password, delete flows (Admin only)
 *
 * Tests are ordered sequentially because they modify shared data.
 */
import { test, expect } from '../auth'

const UNIQUE = Date.now().toString(36)
const USER_NAME = `E2E User ${UNIQUE}`
const USER_EMAIL = `e2e-${UNIQUE}@test.example.com`
const USER_PASSWORD = `TestPass123!${UNIQUE}`

// ─── 1. Admin creates a user ────────────────────────────────────

test.describe('Admin: Create User', () => {
  test('can create an agent user via dialog', async ({ adminPage }) => {
    await adminPage.goto('/en/users')
    await expect(adminPage.getByRole('heading', { name: 'Users' })).toBeVisible({ timeout: 10000 })

    // Click "Create User" button
    await adminPage.getByRole('button', { name: 'Create User' }).click()

    // Dialog should appear
    await expect(adminPage.getByRole('heading', { name: 'Create User' })).toBeVisible({
      timeout: 5000,
    })

    // Fill in name
    await adminPage.getByRole('dialog').locator('input[placeholder="Name"]').fill(USER_NAME)

    // Fill in email
    await adminPage.getByRole('dialog').locator('input[placeholder="Email"]').fill(USER_EMAIL)

    // Fill in password
    await adminPage.getByRole('dialog').locator('input[placeholder="Password"]').fill(USER_PASSWORD)

    // Role defaults to "Agent" (the InlineSelect default) — leave as is

    // Submit — button text is "Create User"
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Create User' }).click()

    // Dialog should close
    await expect(adminPage.getByRole('dialog')).not.toBeVisible({
      timeout: 10000,
    })

    // The new user should appear in the list
    await adminPage.waitForTimeout(1000)
    await expect(adminPage.getByText(USER_NAME).first()).toBeVisible({
      timeout: 10000,
    })
    await expect(adminPage.getByText(USER_EMAIL).first()).toBeVisible()
  })
})

// ─── 2. Admin edits a user ──────────────────────────────────────

test.describe('Admin: Edit User', () => {
  const UPDATED_NAME = `${USER_NAME} Edited`

  test('can edit user name via dialog', async ({ adminPage }) => {
    await adminPage.goto('/en/users')
    await expect(adminPage.getByText(USER_NAME).first()).toBeVisible({ timeout: 10000 })

    // Find the user row and click the "Edit" text button
    const userRow = adminPage
      .locator(".group, [class*='hover:bg-muted']")
      .filter({ hasText: USER_EMAIL })
      .first()

    // Hover to reveal action buttons
    await userRow.hover()

    // Click the Edit button
    await userRow.getByRole('button', { name: 'Edit' }).click()

    // Edit dialog should appear
    await expect(adminPage.getByRole('heading', { name: 'Edit User' })).toBeVisible({
      timeout: 5000,
    })

    // Change the name
    const nameInput = adminPage.getByRole('dialog').locator('input').first()
    await nameInput.clear()
    await nameInput.fill(UPDATED_NAME)

    // Save — button text is "Save"
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Save' }).click()

    // Dialog should close
    await expect(adminPage.getByRole('dialog')).not.toBeVisible({
      timeout: 10000,
    })

    // The updated name should appear
    await adminPage.waitForTimeout(1000)
    await expect(adminPage.getByText(UPDATED_NAME).first()).toBeVisible({
      timeout: 10000,
    })
  })
})

// ─── 3. Admin resets a user's password ──────────────────────────

test.describe('Admin: Reset Password', () => {
  test('can reset password and see temporary password', async ({ adminPage }) => {
    await adminPage.goto('/en/users')
    await expect(adminPage.getByText(USER_EMAIL).first()).toBeVisible({ timeout: 10000 })

    // Find the user row
    const userRow = adminPage
      .locator(".group, [class*='hover:bg-muted']")
      .filter({ hasText: USER_EMAIL })
      .first()

    // Hover to reveal action buttons
    await userRow.hover()

    // Click the reset password button (RotateCcw icon with title="Reset Password")
    const resetButton = userRow.locator('button[title="Reset Password"]')
    await expect(resetButton).toBeVisible({ timeout: 3000 })
    await resetButton.click()

    // Reset password dialog should appear
    await expect(adminPage.getByRole('heading', { name: 'Reset Password' })).toBeVisible({
      timeout: 5000,
    })

    // Click "Confirm" to reset
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click()

    // The dialog should now show "Temporary Password" with the generated password
    await expect(adminPage.getByText('Temporary Password')).toBeVisible({ timeout: 10000 })

    // A code element with the temporary password should be visible
    await expect(adminPage.locator('code')).toBeVisible()

    // Close the dialog — use first() as there may be multiple close buttons
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Close' }).first().click()

    await expect(adminPage.getByRole('dialog')).not.toBeVisible({
      timeout: 5000,
    })
  })
})

// ─── 4. Admin deletes a user ────────────────────────────────────

test.describe('Admin: Delete User', () => {
  test('can delete the created user via edit dialog', async ({ adminPage }) => {
    await adminPage.goto('/en/users')
    await expect(adminPage.getByText(USER_EMAIL).first()).toBeVisible({ timeout: 10000 })

    // Find the user row
    const userRow = adminPage
      .locator(".group, [class*='hover:bg-muted']")
      .filter({ hasText: USER_EMAIL })
      .first()

    // Hover to reveal action buttons
    await userRow.hover()

    // Click "Edit" to open the edit dialog (delete is inside the edit dialog)
    await userRow.getByRole('button', { name: 'Edit' }).click()

    // Edit dialog should appear
    await expect(adminPage.getByRole('heading', { name: 'Edit User' })).toBeVisible({
      timeout: 5000,
    })

    // Click "Delete User" button at the bottom-left of the dialog
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Delete User' }).click()

    // AlertDialog confirmation should appear
    await expect(adminPage.getByText('Are you sure you want to delete this user?')).toBeVisible({
      timeout: 5000,
    })

    // Click "Delete" to confirm
    await adminPage.getByRole('button', { name: 'Delete' }).click()

    // Both dialogs should close
    await adminPage.waitForTimeout(1500)
    await expect(adminPage.getByRole('dialog')).not.toBeVisible({
      timeout: 5000,
    })

    // The user should no longer be in the list
    await expect(adminPage.getByText(USER_EMAIL).first()).not.toBeVisible({ timeout: 5000 })
  })
})
