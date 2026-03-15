/**
 * Integration test global setup
 * Creates solvesk_test database and applies schema via drizzle-kit push
 */
import { execSync } from 'child_process'
import postgres from 'postgres'

export async function setup() {
  const adminUrl = 'postgresql://postgres:postgres@localhost:5432/postgres'
  const testDbName = 'solvesk_test'

  // Create test database if it doesn't exist
  const adminClient = postgres(adminUrl, { max: 1 })
  try {
    const existing = await adminClient`
      SELECT 1 FROM pg_database WHERE datname = ${testDbName}
    `
    if (existing.length === 0) {
      await adminClient.unsafe(`CREATE DATABASE ${testDbName}`)
      console.log(`✅ Created database: ${testDbName}`)
    }
  } finally {
    await adminClient.end()
  }

  // Apply schema using drizzle-kit push
  execSync(
    `npx drizzle-kit push --force --dialect=postgresql --schema=./src/db/schema.ts --url="postgresql://postgres:postgres@localhost:5432/${testDbName}"`,
    { stdio: 'pipe' }
  )
  console.log('✅ Schema applied to test database')
}

export async function teardown() {
  // Leave test DB for debugging — can be dropped manually if needed
}
