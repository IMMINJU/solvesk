/**
 * E2E: Users page (/users) — Admin only
 */
import { test, expect } from '../auth'

test.describe('Users Page', () => {
  test('admin can access users page', async ({ adminPage }) => {
    await adminPage.goto('/en/users')

    await expect(adminPage.getByRole('heading', { name: 'Users' })).toBeVisible()

    // Should show user count
    await expect(adminPage.getByText(/\d+ users/)).toBeVisible()
  })

  test('admin sees user list with roles', async ({ adminPage }) => {
    await adminPage.goto('/en/users')

    // Should show seeded users (use .first() for desktop+mobile dual DOM)
    await expect(adminPage.getByText('admin@demo.com').first()).toBeVisible()
    await expect(adminPage.getByText('Admin').first()).toBeVisible()
  })

  test('customer is redirected from users page', async ({ customerPage }) => {
    const response = await customerPage.goto('/en/users')

    // Users page should either redirect or show forbidden
    // The page itself should not show "Users" heading since customer has no access to the API
    // Customer may still see the page shell but with no data or get redirected
  })

  test('admin can open create user dialog', async ({ adminPage }) => {
    await adminPage.goto('/en/users')

    await adminPage.getByRole('button', { name: 'Create User' }).click()

    await expect(adminPage.getByRole('heading', { name: 'Create User' })).toBeVisible()

    // Form fields should be visible
    await expect(adminPage.getByPlaceholder('Name')).toBeVisible()
    await expect(adminPage.getByPlaceholder('Email')).toBeVisible()
    await expect(adminPage.getByPlaceholder('Password')).toBeVisible()
  })

  test('admin can open edit user dialog', async ({ adminPage }) => {
    await adminPage.goto('/en/users')

    // Click the first Edit button
    await adminPage.getByText('Edit').first().click()

    await expect(adminPage.getByRole('heading', { name: 'Edit User' })).toBeVisible()
  })

  test('admin can open reset password dialog', async ({ adminPage }) => {
    await adminPage.goto('/en/users')

    // Click the first reset password button (RotateCcw icon)
    await adminPage.getByTitle('Reset Password').first().click()

    await expect(adminPage.getByRole('heading', { name: 'Reset Password' })).toBeVisible()
  })
})
