/**
 * Seed script — creates demo data for development
 *
 * Usage: pnpm db:seed
 *
 * Demo accounts:
 *   admin@demo.com    / password123 (Admin)
 *   agent1@demo.com   / password123 (Agent, ACME + GLX)
 *   agent2@demo.com   / password123 (Agent, ACME only)
 *   customer1@demo.com / password123 (Customer, ACME)
 *   customer2@demo.com / password123 (Customer, GLX)
 */

import 'dotenv/config'
import { seedDatabase } from './seed-data'

async function seed() {
  console.log('🌱 Seeding database...\n')

  await seedDatabase()

  console.log('\n✅ Seed complete!\n')
  console.log('Demo accounts (password: password123):')
  console.log('  admin@demo.com     (Admin)')
  console.log('  agent1@demo.com    (Agent - ACME, GLX)')
  console.log('  agent2@demo.com    (Agent - ACME)')
  console.log('  customer1@demo.com (Customer - ACME)')
  console.log('  customer2@demo.com (Customer - GLX)')
  console.log('\nProjects: ACME (5 issues), GLX (3 issues)')
  console.log('Labels: bug, feature, question, urgent, documentation')

  process.exit(0)
}

seed().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
