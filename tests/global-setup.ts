/**
 * Playwright global setup
 * Re-seeds database and logs in as admin, agent, and customer — saves auth state for each role
 */
import { execSync } from 'child_process'
import { chromium, type FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const AUTH_DIR = path.join(__dirname, '.auth')

const TEST_USERS = [
  { role: 'admin', email: 'admin@demo.com', password: 'password123' },
  { role: 'agent', email: 'agent1@demo.com', password: 'password123' },
  { role: 'agent2', email: 'agent2@demo.com', password: 'password123' },
  { role: 'customer', email: 'customer1@demo.com', password: 'password123' },
] as const

async function globalSetup(config: FullConfig) {
  // Re-seed database to ensure clean state (e.g. password changes from previous runs)
  console.log('🌱 Re-seeding database for E2E...')
  execSync('pnpm db:seed', { stdio: 'pipe', cwd: path.join(__dirname, '..') })
  console.log('✅ Database seeded')

  // Ensure auth directory exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true })
  }

  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000'
  const browser = await chromium.launch()

  for (const user of TEST_USERS) {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await page.goto(`${baseURL}/en/auth/signin`)
      await page.fill('#email', user.email)
      await page.fill('#password', user.password)
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard', { timeout: 15000 })

      // Save auth state per role
      const authFile = path.join(AUTH_DIR, `${user.role}.json`)
      await context.storageState({ path: authFile })
      console.log(`✅ Auth saved: ${user.role} (${user.email})`)
    } catch (error) {
      console.error(`❌ Auth failed for ${user.role}: ${error}`)
      throw error
    } finally {
      await context.close()
    }
  }

  await browser.close()
}

export default globalSetup
