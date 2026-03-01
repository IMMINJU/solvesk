/**
 * Lightweight browser automation for visual verification
 *
 * Usage:
 *   node scripts/browser.mjs '<json actions array>'
 *
 * Actions:
 *   goto     - {"action":"goto","url":"http://..."}
 *   fill     - {"action":"fill","selector":"#email","value":"test@test.com"}
 *   click    - {"action":"click","selector":"button[type=submit]"}
 *   screenshot - {"action":"screenshot","name":"step-01"}
 *   wait     - {"action":"wait","ms":1000}
 *   waitFor  - {"action":"waitFor","selector":".dashboard","timeout":5000}
 *   text     - {"action":"text","selector":"h1"} — logs text content
 *   url      - {"action":"url"} — logs current URL
 *
 * Screenshots saved to: screenshots/<name>.png
 * Browser state saved to: screenshots/.state.json (cookies persist across runs)
 */

import { chromium } from 'playwright'
import { existsSync } from 'fs'
import path from 'path'

const SCREENSHOTS_DIR = path.resolve('screenshots')
const STATE_FILE = path.join(SCREENSHOTS_DIR, '.state.json')

async function run() {
  const input = process.argv[2]
  if (!input) {
    console.error("Usage: node scripts/browser.mjs '<json actions>'")
    process.exit(1)
  }

  let actions
  try {
    actions = JSON.parse(input)
  } catch {
    console.error('Invalid JSON:', input)
    process.exit(1)
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ...(existsSync(STATE_FILE) ? { storageState: STATE_FILE } : {}),
  })
  const page = await context.newPage()

  try {
    for (const act of actions) {
      switch (act.action) {
        case 'goto':
          console.log(`→ goto ${act.url}`)
          await page.goto(act.url, { waitUntil: 'networkidle' })
          break

        case 'fill':
          console.log(`→ fill ${act.selector} = "${act.value}"`)
          await page.fill(act.selector, act.value)
          break

        case 'click':
          console.log(`→ click ${act.selector}`)
          await page.click(act.selector)
          break

        case 'screenshot': {
          const name = act.name || 'screenshot'
          const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`)
          await page.screenshot({ path: filepath, fullPage: act.fullPage ?? false })
          console.log(`→ screenshot saved: ${filepath}`)
          break
        }

        case 'wait':
          console.log(`→ wait ${act.ms}ms`)
          await page.waitForTimeout(act.ms)
          break

        case 'waitFor':
          console.log(`→ waitFor ${act.selector}`)
          await page.waitForSelector(act.selector, {
            timeout: act.timeout ?? 5000,
          })
          break

        case 'text': {
          const el = await page.$(act.selector)
          const text = el ? await el.textContent() : '(not found)'
          console.log(`→ text ${act.selector}: "${text?.trim()}"`)
          break
        }

        case 'url':
          console.log(`→ url: ${page.url()}`)
          break

        default:
          console.warn(`→ unknown action: ${act.action}`)
      }
    }

    // Persist browser state (cookies, localStorage)
    await context.storageState({ path: STATE_FILE })
  } catch (err) {
    console.error('Error:', err.message)
    // Save error screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'error.png'),
    })
    console.log('→ error screenshot saved')
  } finally {
    await browser.close()
  }
}

run()
