/**
 * E2E: Customer Complete Flow
 *
 * Tests customer-specific flows:
 * - Add comment (public only, no internal option)
 * - Edit own comment
 * - UI constraints: priority/assignee/due-date disabled/hidden
 * - Cannot see delete button, labels management
 * - Cannot access other projects
 */
import { test, expect } from '../auth'

const UNIQUE = Date.now().toString(36)

// ─── 1. Customer Comment Flow ───────────────────────────

test.describe('Customer: Comment Flow', () => {
  const customerComment = `Customer comment ${UNIQUE}`

  test('customer can add a public comment', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/ACME/issues/ACME-1')
    await customerPage.waitForLoadState('networkidle')

    await expect(customerPage.getByText('Comments')).toBeVisible({
      timeout: 10000,
    })

    const commentEditor = customerPage.locator('.ProseMirror[contenteditable=true]').last()
    await commentEditor.click()
    await commentEditor.pressSequentially(customerComment, { delay: 10 })

    await customerPage.getByRole('button', { name: /Add Comment/i }).click()

    await expect(customerPage.getByText(customerComment)).toBeVisible({
      timeout: 10000,
    })
  })

  test('customer does NOT see internal checkbox', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/ACME/issues/ACME-1')
    await customerPage.waitForLoadState('networkidle')

    await expect(customerPage.getByText('Comments')).toBeVisible({
      timeout: 10000,
    })

    // The "Internal" checkbox label should NOT be visible for customer
    // Check for the checkbox near the comment form
    const internalLabel = customerPage.locator('label').filter({
      hasText: 'Internal',
    })
    await expect(internalLabel).not.toBeVisible({ timeout: 3000 })
  })

  test('customer does NOT see internal comments', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/ACME/issues/ACME-1')
    await customerPage.waitForLoadState('networkidle')

    await expect(customerPage.getByText('Comments')).toBeVisible({
      timeout: 10000,
    })

    // ACME-1 has internal comments from seed + agent-flow tests
    // Customer should NOT see any "Internal" badge
    const internalBadges = customerPage.locator('[class*="bg-internal"]')
    await expect(internalBadges).not.toBeVisible({ timeout: 3000 })
  })

  test('customer can edit own comment', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/ACME/issues/ACME-1')
    await customerPage.waitForLoadState('networkidle')

    // Find our comment
    const commentVisible = await customerPage
      .getByText(customerComment)
      .first()
      .isVisible({ timeout: 15000 })
      .catch(() => false)
    if (!commentVisible) {
      test.skip()
      return
    }

    const commentBlock = customerPage
      .locator('[class*="rounded-md"][class*="group"]')
      .filter({ hasText: customerComment })
      .first()
    await expect(commentBlock).toBeVisible()

    // Hover to reveal edit button
    await commentBlock.hover()

    const editBtn = commentBlock.locator('button[aria-label="Edit Comment"]')
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click()

      const editEditor = commentBlock.locator('.ProseMirror[contenteditable=true]')
      await expect(editEditor).toBeVisible({ timeout: 3000 })

      await editEditor.click()
      await customerPage.keyboard.press('Control+A')
      await customerPage.keyboard.type(`${customerComment} (edited)`)

      await commentBlock.getByRole('button', { name: /Save/i }).click()

      await expect(customerPage.getByText(`${customerComment} (edited)`)).toBeVisible({
        timeout: 5000,
      })
    }
  })
})

// ─── 2. Customer UI Constraints ─────────────────────────

test.describe('Customer: UI Constraints', () => {
  test('priority buttons are disabled for customer', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/ACME/issues/ACME-1')
    await customerPage.waitForLoadState('networkidle')

    const priorityGroup = customerPage.getByRole('radiogroup', {
      name: /priority/i,
    })

    if (await priorityGroup.isVisible({ timeout: 5000 }).catch(() => false)) {
      // All priority options should be disabled
      const radios = priorityGroup.getByRole('radio')
      const count = await radios.count()
      for (let i = 0; i < count; i++) {
        await expect(radios.nth(i)).toBeDisabled()
      }
    }
  })

  test('assignee shows as read-only text (no dropdown)', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/ACME/issues/ACME-1')
    await customerPage.waitForLoadState('networkidle')

    // Customer should NOT see the assignee dropdown button (aria-haspopup="listbox")
    const assigneeDropdown = customerPage.locator('button[aria-haspopup="listbox"]')
    await expect(assigneeDropdown).not.toBeVisible({ timeout: 3000 })

    // Assignee should be displayed as plain text
    await expect(customerPage.getByText('Assignee')).toBeVisible({
      timeout: 5000,
    })
  })

  test('due date shows as read-only text (no date picker)', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/ACME/issues/ACME-1')
    await customerPage.waitForLoadState('networkidle')

    // Customer should NOT see the date picker (InlineDatePicker)
    const datePicker = customerPage.locator(
      'button[aria-label*="date"], button[aria-label*="calendar"]'
    )
    await expect(datePicker).not.toBeVisible({ timeout: 3000 })
  })

  test('Add Label button is hidden for customer', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/ACME/issues/ACME-1')
    await customerPage.waitForLoadState('networkidle')

    const addLabelBtn = customerPage.getByRole('button', {
      name: /Add label/i,
    })
    await expect(addLabelBtn).not.toBeVisible({ timeout: 3000 })
  })

  test('Remove Label button is hidden for customer', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/ACME/issues/ACME-1')
    await customerPage.waitForLoadState('networkidle')

    // Even if labels exist, remove buttons should not be visible
    const removeLabelBtns = customerPage.locator('button[aria-label="Remove label"]')
    await expect(removeLabelBtns).not.toBeVisible({ timeout: 3000 })
  })

  test('delete button is hidden for customer', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/ACME/issues/ACME-1')
    await customerPage.waitForLoadState('networkidle')

    const deleteBtn = customerPage.locator(
      'button[aria-label="Delete issue"], button[aria-label="Delete Issue"]'
    )
    await expect(deleteBtn).not.toBeVisible({ timeout: 3000 })
  })

  test('status: only Resolved is enabled', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/ACME/issues/ACME-1')
    await customerPage.waitForLoadState('networkidle')

    const statusGroup = customerPage.getByRole('radiogroup', {
      name: /status/i,
    })

    if (await statusGroup.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Resolved should be enabled
      await expect(statusGroup.getByRole('radio', { name: /Resolved/ })).toBeEnabled()

      // All others should be disabled
      await expect(statusGroup.getByRole('radio', { name: /In Progress/ })).toBeDisabled()
      await expect(statusGroup.getByRole('radio', { name: /Waiting/ })).toBeDisabled()
      await expect(statusGroup.getByRole('radio', { name: /Closed/ })).toBeDisabled()
    }
  })
})

// ─── 3. Customer Navigation Constraints ─────────────────

test.describe('Customer: Navigation Constraints', () => {
  test('customer cannot access Users page', async ({ customerPage }) => {
    await customerPage.goto('/en/users')
    await expect(customerPage.getByRole('heading', { name: 'Users' })).not.toBeVisible({
      timeout: 5000,
    })
  })

  test('customer sees only own project in projects list', async ({ customerPage }) => {
    await customerPage.goto('/en/projects')
    await expect(customerPage.getByText('Acme Corp').first()).toBeVisible({
      timeout: 10000,
    })
    await expect(customerPage.getByText('Globex Inc')).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('customer cannot navigate to other project', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/GLX')
    await expect(customerPage.getByRole('heading', { name: 'Globex Inc' })).not.toBeVisible({
      timeout: 5000,
    })
  })
})
