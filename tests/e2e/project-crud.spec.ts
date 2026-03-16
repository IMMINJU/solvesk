/**
 * E2E: Project CRUD — create, edit, delete flows (Admin only)
 *
 * Tests are ordered sequentially because they modify shared data.
 */
import { test, expect } from '../auth'

const UNIQUE = Date.now().toString(36)
const PROJECT_NAME = `E2E Project ${UNIQUE}`
const PROJECT_CODE = `E2E${UNIQUE}`
  .toUpperCase()
  .replace(/[^A-Z0-9_]/g, '')
  .slice(0, 10)
const PROJECT_DESC = `Test project created by E2E ${UNIQUE}`

// ─── 1. Admin creates a project ─────────────────────────────────

test.describe('Admin: Create Project', () => {
  test('can create a project via dialog', async ({ adminPage }) => {
    await adminPage.goto('/en/projects')
    await expect(adminPage.getByRole('heading', { name: 'Projects' })).toBeVisible({
      timeout: 10000,
    })

    // Click the "Create Project" button
    await adminPage.getByRole('button', { name: /Create Project/i }).click()

    // Dialog should appear
    await expect(adminPage.getByRole('heading', { name: /Create Project/i })).toBeVisible({
      timeout: 5000,
    })

    // Fill in name
    await adminPage.locator('#project-name').fill(PROJECT_NAME)

    // Fill in code
    await adminPage.locator('#project-code').fill(PROJECT_CODE)

    // Fill in description
    await adminPage.locator('#project-desc').fill(PROJECT_DESC)

    // Submit — the button text is "Create" (from common.create)
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Create' }).click()

    // Dialog should close
    await expect(adminPage.getByRole('dialog')).not.toBeVisible({
      timeout: 10000,
    })

    // The new project should appear in the list
    await adminPage.waitForTimeout(1000)
    await expect(adminPage.getByText(PROJECT_NAME).first()).toBeVisible({
      timeout: 10000,
    })

    // The code should also be visible
    await expect(adminPage.getByText(PROJECT_CODE).first()).toBeVisible()
  })
})

// ─── 2. Admin edits a project ───────────────────────────────────

test.describe('Admin: Edit Project', () => {
  const UPDATED_NAME = `${PROJECT_NAME} Updated`

  test('can edit project name via dialog', async ({ adminPage }) => {
    await adminPage.goto('/en/projects')
    await expect(adminPage.getByText(PROJECT_NAME).first()).toBeVisible({ timeout: 10000 })

    // Find the project row and click the edit button (pencil icon)
    // The edit button has aria-label "Edit" and is in the row with our project
    const projectRow = adminPage
      .locator(".group, [class*='hover:bg-muted']")
      .filter({ hasText: PROJECT_NAME })
      .first()

    // Hover to reveal the action buttons (desktop: opacity-0 until hover)
    await projectRow.hover()

    // Click the edit button (aria-label="Edit")
    await projectRow.getByRole('button', { name: 'Edit' }).click()

    // Edit dialog should appear
    await expect(adminPage.getByRole('heading', { name: /Edit Project/i })).toBeVisible({
      timeout: 5000,
    })

    // Change the name
    const nameInput = adminPage.locator('#project-name')
    await nameInput.clear()
    await nameInput.fill(UPDATED_NAME)

    // Save — the button text is "Save" (from common.save)
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Save' }).click()

    // Dialog should close
    await expect(adminPage.getByRole('dialog')).not.toBeVisible({
      timeout: 10000,
    })

    // The updated name should appear in the list
    await adminPage.waitForTimeout(1000)
    await expect(adminPage.getByText(UPDATED_NAME).first()).toBeVisible({
      timeout: 10000,
    })
  })
})

// ─── 3. Admin deletes a project ─────────────────────────────────

test.describe('Admin: Delete Project', () => {
  // We delete the project created above (name may have been updated)
  const TARGET_NAME_FRAGMENT = `E2E Project ${UNIQUE}`

  test('can delete the project', async ({ adminPage }) => {
    await adminPage.goto('/en/projects')

    // Wait for the project to be visible (could be original or updated name)
    await expect(adminPage.getByText(TARGET_NAME_FRAGMENT).first()).toBeVisible({ timeout: 10000 })

    // Find the project row
    const projectRow = adminPage
      .locator(".group, [class*='hover:bg-muted']")
      .filter({ hasText: TARGET_NAME_FRAGMENT })
      .first()

    // Hover to reveal action buttons
    await projectRow.hover()

    // Click the delete button (trash icon) — ConfirmDeleteButton renders a trash icon
    // The button has title="Delete"
    const deleteButton = projectRow.locator('button[title="Delete"]')
    await expect(deleteButton).toBeVisible({ timeout: 3000 })
    await deleteButton.click()

    // ConfirmDeleteButton shows a confirmation inline with "Delete" and "Cancel" buttons
    // Click the confirm "Delete" button
    const confirmDelete = projectRow.getByRole('button', { name: 'Delete' })
    await expect(confirmDelete).toBeVisible({ timeout: 3000 })
    await confirmDelete.click()

    // Wait for deletion
    await adminPage.waitForTimeout(1500)

    // The project should no longer be visible
    await expect(adminPage.getByText(TARGET_NAME_FRAGMENT).first()).not.toBeVisible({
      timeout: 5000,
    })
  })
})
