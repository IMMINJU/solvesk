/**
 * E2E: Projects pages (/projects, /projects/[code])
 */
import { test, expect } from '../auth'

test.describe('Projects List', () => {
  test('admin sees all projects', async ({ adminPage }) => {
    await adminPage.goto('/en/projects')
    await expect(adminPage.getByText('Acme Corp').first()).toBeVisible()
    await expect(adminPage.getByText('Globex Inc').first()).toBeVisible()
  })

  test('admin can open create project dialog', async ({ adminPage }) => {
    await adminPage.goto('/en/projects')

    await adminPage.getByRole('button', { name: /create|new project/i }).click()

    // Dialog should appear with form fields
    await expect(adminPage.getByRole('heading', { name: /create project/i })).toBeVisible()
  })

  test('customer sees only their project', async ({ customerPage }) => {
    await customerPage.goto('/en/projects')
    // customer1 belongs to ACME
    await expect(customerPage.getByText('Acme Corp').first()).toBeVisible()
    await expect(customerPage.getByText('Globex Inc')).not.toBeVisible({
      timeout: 3000,
    })
  })
})

test.describe('Project Detail', () => {
  test('admin can view project with issue list', async ({ adminPage }) => {
    await adminPage.goto('/en/projects/ACME')

    // Project name visible
    await expect(adminPage.getByRole('heading', { name: 'Acme Corp' })).toBeVisible()

    // Issues listed (use .first() — desktop table + mobile card both in DOM)
    await expect(
      adminPage.getByText('Login page returns 500 error on mobile').first()
    ).toBeVisible()
  })

  test('agent sees assigned project issues', async ({ agentPage }) => {
    await agentPage.goto('/en/projects/ACME')
    await expect(
      agentPage.getByText('Login page returns 500 error on mobile').first()
    ).toBeVisible()
  })

  test('customer cannot access other project', async ({ customerPage }) => {
    await customerPage.goto('/en/projects/GLX')
    // Should not show GLX project content
    await expect(customerPage.getByText('API rate limiting too aggressive')).not.toBeVisible({
      timeout: 5000,
    })
  })

  test('admin can see create issue button', async ({ adminPage }) => {
    await adminPage.goto('/en/projects/ACME')
    await expect(adminPage.getByRole('button', { name: /create|new issue/i })).toBeVisible()
  })
})
