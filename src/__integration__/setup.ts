/**
 * Integration test helpers — DB cleanup + utilities
 */
import { db } from '@/db'
import {
  notifications,
  auditLogs,
  issueLabels,
  attachments,
  comments,
  issues,
  labels,
  projectMembers,
  projects,
  users,
  sessions,
  accounts,
} from '@/db/schema'
import { sql } from 'drizzle-orm'

/**
 * Truncate all tables in reverse FK order.
 * Call this in beforeAll/beforeEach to ensure test isolation.
 */
export async function cleanDatabase() {
  await db.delete(notifications)
  await db.delete(auditLogs)
  await db.delete(issueLabels)
  await db.delete(attachments)
  await db.delete(comments)
  await db.delete(issues)
  await db.delete(labels)
  await db.delete(projectMembers)
  await db.delete(sessions)
  await db.delete(accounts)
  // Clear customer projectId FK before deleting projects
  await db.execute(sql`UPDATE users SET project_id = NULL WHERE project_id IS NOT NULL`)
  await db.delete(projects)
  await db.delete(users)
}
