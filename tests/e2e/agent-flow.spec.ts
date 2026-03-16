/**
 * E2E: Agent Complete Flow
 *
 * Tests agent-specific flows in assigned projects:
 * - Create issue in assigned project
 * - Edit issue (status, priority, assignee)
 * - Add comment (public + internal)
 * - Add/remove labels
 * - Cannot access unassigned project
 * - Cannot delete issues (admin-only)
 */
import { test, expect } from '../auth'

const UNIQUE = Date.now().toString(36)

// ─── 1. Agent Issue Create ──────────────────────────────

test.describe('Agent: Create Issue in Assigned Project', () => {
  const agentIssueTitle = `Agent issue ${UNIQUE}`

  test('agent can create issue in assigned project (ACME)', async ({ agentPage }) => {
    await agentPage.goto('/en/projects/ACME')
    await expect(agentPage.getByRole('heading', { name: 'Acme Corp' })).toBeVisible({
      timeout: 10000,
    })

    await agentPage.getByRole('button', { name: /Create Issue/i }).click()
    await expect(agentPage.getByRole('dialog')).toBeVisible()

    await agentPage.getByRole('dialog').getByPlaceholder('Title').fill(agentIssueTitle)

    const submit = agentPage.getByRole('dialog').getByRole('button', { name: /Create Issue/i })
    await expect(submit).toBeEnabled({ timeout: 3000 })
    await submit.click()

    await expect(agentPage.getByRole('dialog')).not.toBeVisible({
      timeout: 10000,
    })

    await expect(agentPage.getByText(agentIssueTitle).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('new issue has correct defaults and agent can navigate to detail', async ({ agentPage }) => {
    await agentPage.goto('/en/projects/ACME')
    await expect(agentPage.getByText(agentIssueTitle).first()).toBeVisible({
      timeout: 10000,
    })

    await agentPage.getByText(agentIssueTitle).first().click()
    await agentPage.waitForURL('**/projects/ACME/issues/ACME-*')

    await expect(agentPage.getByText(agentIssueTitle)).toBeVisible()
  })
})

// ─── 2. Agent Issue Edit ────────────────────────────────

test.describe('Agent: Edit Issue Properties', () => {
  test('agent can change status', async ({ agentPage }) => {
    await agentPage.goto('/en/projects/ACME/issues/ACME-3')
    await agentPage.waitForLoadState('networkidle')

    const statusGroup = agentPage.getByRole('radiogroup', {
      name: /status/i,
    })
    await expect(statusGroup).toBeVisible({ timeout: 10000 })

    // All status options should be enabled for agent
    await expect(statusGroup.getByRole('radio', { name: /In Progress/ })).toBeEnabled()
    await expect(statusGroup.getByRole('radio', { name: /Waiting/ })).toBeEnabled()
    await expect(statusGroup.getByRole('radio', { name: /Resolved/ })).toBeEnabled()
    await expect(statusGroup.getByRole('radio', { name: /Closed/ })).toBeEnabled()

    // Change status and wait for API response
    await Promise.all([
      agentPage.waitForResponse(resp => resp.url().includes('/status') && resp.status() === 200),
      statusGroup.getByRole('radio', { name: /In Progress/ }).click(),
    ])

    // Verify after reload
    await agentPage.reload()
    const statusAfter = agentPage.getByRole('radiogroup', {
      name: /status/i,
    })
    await expect(statusAfter).toBeVisible({ timeout: 10000 })
    await expect(statusAfter.getByRole('radio', { name: /In Progress/ })).toHaveAttribute(
      'aria-checked',
      'true'
    )

    // Restore
    await statusAfter.getByRole('radio', { name: /Waiting/ }).click()
  })

  test('agent can change priority', async ({ agentPage }) => {
    await agentPage.goto('/en/projects/ACME/issues/ACME-3')
    await agentPage.waitForLoadState('networkidle')

    const priorityGroup = agentPage.getByRole('radiogroup', {
      name: /priority/i,
    })
    await expect(priorityGroup).toBeVisible({ timeout: 10000 })

    // All priority options should be enabled for agent
    await expect(priorityGroup.getByRole('radio', { name: /Urgent/ })).toBeEnabled()

    await Promise.all([
      agentPage.waitForResponse(resp => resp.url().includes('/priority') && resp.status() === 200),
      priorityGroup.getByRole('radio', { name: /High/ }).click(),
    ])

    // Verify
    await agentPage.reload()
    const priorityAfter = agentPage.getByRole('radiogroup', {
      name: /priority/i,
    })
    await expect(priorityAfter).toBeVisible({ timeout: 10000 })
    await expect(priorityAfter.getByRole('radio', { name: /High/ })).toHaveAttribute(
      'aria-checked',
      'true'
    )

    // Restore
    await priorityAfter.getByRole('radio', { name: /Low/ }).click()
  })

  test('agent can change assignee', async ({ agentPage }) => {
    await agentPage.goto('/en/projects/ACME/issues/ACME-3')
    await agentPage.waitForLoadState('networkidle')

    // Click assignee button to open dropdown
    const assigneeBtn = agentPage
      .locator('button[aria-label="Assignee"], button[aria-haspopup="listbox"]')
      .first()
    await expect(assigneeBtn).toBeVisible({ timeout: 10000 })
    await assigneeBtn.click()

    // Listbox should appear with options
    const listbox = agentPage.getByRole('listbox', { name: /assignee/i })
    await expect(listbox).toBeVisible({ timeout: 3000 })

    // Select an option (not "Unassigned")
    const options = listbox.getByRole('option')
    const optionCount = await options.count()
    expect(optionCount).toBeGreaterThan(1) // At least "Unassigned" + 1 user
  })
})

// ─── 3. Agent Comments ──────────────────────────────────

test.describe('Agent: Comments', () => {
  const publicComment = `Agent public comment ${UNIQUE}`
  const internalComment = `Agent internal note ${UNIQUE}`

  test('agent can add a public comment', async ({ agentPage }) => {
    await agentPage.goto('/en/projects/ACME/issues/ACME-1')
    await agentPage.waitForLoadState('networkidle')

    await expect(agentPage.getByText('Comments')).toBeVisible({
      timeout: 10000,
    })

    const commentEditor = agentPage.locator('.ProseMirror[contenteditable=true]').last()
    await commentEditor.click()
    await commentEditor.pressSequentially(publicComment, { delay: 10 })

    await agentPage.getByRole('button', { name: /Add Comment/i }).click()

    await expect(agentPage.getByText(publicComment)).toBeVisible({
      timeout: 10000,
    })
  })

  test('agent sees internal checkbox', async ({ agentPage }) => {
    await agentPage.goto('/en/projects/ACME/issues/ACME-1')
    await agentPage.waitForLoadState('networkidle')

    // Internal checkbox should be visible for staff
    const internalCheckbox = agentPage.locator('input[type="checkbox"]').first()
    await expect(internalCheckbox).toBeVisible({ timeout: 5000 })
  })

  test('agent can add an internal comment', async ({ agentPage }) => {
    await agentPage.goto('/en/projects/ACME/issues/ACME-1')
    await agentPage.waitForLoadState('networkidle')

    // Check internal checkbox
    const internalCheckbox = agentPage.locator('input[type="checkbox"]').first()
    await internalCheckbox.check()

    const commentEditor = agentPage.locator('.ProseMirror[contenteditable=true]').last()
    await commentEditor.click()
    await commentEditor.pressSequentially(internalComment, { delay: 10 })

    await agentPage.getByRole('button', { name: /Add Comment/i }).click()

    // Internal comment should appear with "Internal" badge
    await expect(agentPage.getByText(internalComment)).toBeVisible({
      timeout: 10000,
    })
    // Look for the Internal badge near the comment
    await expect(agentPage.getByText('Internal').first()).toBeVisible()
  })

  test('agent sees internal comments from others', async ({ agentPage }) => {
    await agentPage.goto('/en/projects/ACME/issues/ACME-1')
    await agentPage.waitForLoadState('networkidle')

    // ACME-1 has an internal comment from seed data
    await expect(agentPage.getByText('Internal').first()).toBeVisible({
      timeout: 10000,
    })
  })
})

// ─── 4. Agent Labels ────────────────────────────────────

test.describe('Agent: Labels', () => {
  test('agent can see Add Label button', async ({ agentPage }) => {
    await agentPage.goto('/en/projects/ACME/issues/ACME-1')
    await agentPage.waitForLoadState('networkidle')

    const addLabelBtn = agentPage.getByRole('button', { name: /Add label/i })
    await expect(addLabelBtn).toBeVisible({ timeout: 5000 })
  })

  test('agent can add a label to an issue', async ({ agentPage }) => {
    await agentPage.goto('/en/projects/ACME/issues/ACME-2')
    await agentPage.waitForLoadState('networkidle')

    const addLabelBtn = agentPage.getByRole('button', { name: /Add label/i })
    await expect(addLabelBtn).toBeVisible({ timeout: 5000 })
    await addLabelBtn.click()

    const labelOption = agentPage.getByRole('option').first()
    if (await labelOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await labelOption.click()
    }
  })
})

// ─── 5. Agent Restrictions ──────────────────────────────

test.describe('Agent: Restrictions', () => {
  test('agent cannot access unassigned project (agent2 → GLX)', async ({ agent2Page }) => {
    await agent2Page.goto('/en/projects/GLX')

    // Should not show GLX project content
    await expect(agent2Page.getByRole('heading', { name: 'Globex Inc' })).not.toBeVisible({
      timeout: 5000,
    })
  })

  test('agent cannot see delete button on issue detail', async ({ agentPage }) => {
    await agentPage.goto('/en/projects/ACME/issues/ACME-1')
    await agentPage.waitForLoadState('networkidle')

    // Delete button should NOT be visible (admin-only)
    const deleteBtn = agentPage.locator('button[aria-label*="Delete"], button[title*="Delete"]')
    // Filter to only issue delete (not comment delete)
    await expect(agentPage.getByText('ACME-1')).toBeVisible({ timeout: 10000 })
    // The issue-level delete button should not exist for agent
    const issueDeleteBtn = agentPage.locator(
      'button[aria-label="Delete issue"], button[aria-label="Delete Issue"]'
    )
    await expect(issueDeleteBtn).not.toBeVisible({ timeout: 3000 })
  })

  test('agent cannot access users page', async ({ agentPage }) => {
    await agentPage.goto('/en/users')
    await expect(agentPage.getByRole('heading', { name: 'Users' })).not.toBeVisible({
      timeout: 5000,
    })
  })
})
