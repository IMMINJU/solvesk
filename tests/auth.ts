/**
 * Auth fixtures for Playwright
 *
 * Usage:
 *   import { test, expect } from '../auth'
 *   test('admin can see users page', async ({ adminPage }) => { ... })
 *   test('customer sees own issues', async ({ customerPage }) => { ... })
 */
import { test as base, type Page, type BrowserContext } from '@playwright/test'
import path from 'path'

type AuthFixtures = {
  adminPage: Page
  agentPage: Page
  agent2Page: Page
  customerPage: Page
  adminContext: BrowserContext
  agentContext: BrowserContext
  agent2Context: BrowserContext
  customerContext: BrowserContext
}

function authFile(role: string) {
  return path.join(__dirname, '.auth', `${role}.json`)
}

export const test = base.extend<AuthFixtures>({
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: authFile('admin'),
    })
    await use(context)
    await context.close()
  },
  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage()
    await use(page)
    await page.close()
  },

  agentContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: authFile('agent'),
    })
    await use(context)
    await context.close()
  },
  agentPage: async ({ agentContext }, use) => {
    const page = await agentContext.newPage()
    await use(page)
    await page.close()
  },

  agent2Context: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: authFile('agent2'),
    })
    await use(context)
    await context.close()
  },
  agent2Page: async ({ agent2Context }, use) => {
    const page = await agent2Context.newPage()
    await use(page)
    await page.close()
  },

  customerContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: authFile('customer'),
    })
    await use(context)
    await context.close()
  },
  customerPage: async ({ customerContext }, use) => {
    const page = await customerContext.newPage()
    await use(page)
    await page.close()
  },
})

export { expect } from '@playwright/test'
