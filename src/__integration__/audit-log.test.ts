/**
 * Integration: Audit log creation
 *
 * Verifies that sensitive operations (delete, create, role change, password)
 * produce correct audit log entries with proper changes recorded.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { db, auditLogs } from '@/db'
import { eq, and, desc } from 'drizzle-orm'
import { cleanDatabase } from './setup'
import { createTestWorld, createIssue, type TestWorld } from './fixtures'
import { issueService } from '@/features/issue/services/issue.service'
import { projectService } from '@/features/project/services/project.service'
import { userService } from '@/features/user/services/user.service'

let world: TestWorld

beforeAll(async () => {
  await cleanDatabase()
  world = await createTestWorld()
})

// ── Helper ───────────────────────────────────────────────

async function getAuditLogs(resourceType: string, action: string) {
  return db.query.auditLogs.findMany({
    where: and(eq(auditLogs.resourceType, resourceType), eq(auditLogs.action, action)),
    orderBy: [desc(auditLogs.createdAt)],
  })
}

async function clearAuditLogs() {
  await db.delete(auditLogs)
}

// ── 1. Issue Delete ──────────────────────────────────────

describe('Issue audit logs', () => {
  it('issue delete creates audit log with title and key', async () => {
    await clearAuditLogs()
    const issue = await createIssue({
      projectId: world.projectA.id,
      reporterId: world.customer1.id,
      title: 'Audit test issue',
    })

    await issueService.delete(world.admin, issue.issueKey)

    const logs = await getAuditLogs('issue', 'delete')
    expect(logs).toHaveLength(1)
    expect(logs[0].userId).toBe(world.admin.id)
    expect(logs[0].resourceId).toBe(String(issue.id))

    const changes = logs[0].changes as Record<string, { before?: string }>
    expect(changes.title.before).toBe('Audit test issue')
    expect(changes.issueKey.before).toBe(issue.issueKey)
  })
})

// ── 2. Project Create / Delete ───────────────────────────

describe('Project audit logs', () => {
  it('project create records name and code', async () => {
    await clearAuditLogs()

    const project = await projectService.create(world.admin, {
      name: 'Audit Project',
      code: 'AUD',
    })

    const logs = await getAuditLogs('project', 'create')
    expect(logs).toHaveLength(1)
    expect(logs[0].userId).toBe(world.admin.id)

    const changes = logs[0].changes as Record<string, { after?: string }>
    expect(changes.name.after).toBe('Audit Project')
    expect(changes.code.after).toBe('AUD')
  })

  it('project delete records name and code', async () => {
    await clearAuditLogs()

    // Create then delete
    const project = await projectService.create(world.admin, {
      name: 'To Delete',
      code: 'DEL',
    })
    await clearAuditLogs() // clear the create log

    await projectService.delete(world.admin, project.id)

    const logs = await getAuditLogs('project', 'delete')
    expect(logs).toHaveLength(1)

    const changes = logs[0].changes as Record<string, { before?: string }>
    expect(changes.name.before).toBe('To Delete')
    expect(changes.code.before).toBe('DEL')
  })
})

// ── 3. User CRUD ─────────────────────────────────────────

describe('User audit logs', () => {
  it('user create records email and role', async () => {
    await clearAuditLogs()

    const newUser = await userService.create(world.admin, {
      email: 'audituser@test.com',
      name: 'Audit User',
      password: 'password123',
      role: 'agent',
    })

    const logs = await getAuditLogs('user', 'create')
    expect(logs).toHaveLength(1)
    expect(logs[0].userId).toBe(world.admin.id)
    expect(logs[0].resourceId).toBe(newUser.id)

    const changes = logs[0].changes as Record<string, { after?: string }>
    expect(changes.email.after).toBe('audituser@test.com')
    expect(changes.role.after).toBe('agent')
  })

  it('user update records role change', async () => {
    await clearAuditLogs()

    const created = await userService.create(world.admin, {
      email: 'rolechange@test.com',
      name: 'Role Test',
      password: 'password123',
      role: 'agent',
    })

    await clearAuditLogs()

    await userService.updateByAdmin(world.admin, created.id, {
      role: 'admin',
    })

    const logs = await getAuditLogs('user', 'update')
    expect(logs).toHaveLength(1)

    const changes = logs[0].changes as Record<string, { before?: string; after?: string }>
    expect(changes.role.before).toBe('agent')
    expect(changes.role.after).toBe('admin')
  })

  it('user delete records email and name', async () => {
    await clearAuditLogs()

    const created = await userService.create(world.admin, {
      email: 'todelete@test.com',
      name: 'Delete Me',
      password: 'password123',
      role: 'agent',
    })

    await clearAuditLogs()

    await userService.deleteByAdmin(world.admin, created.id)

    const logs = await getAuditLogs('user', 'delete')
    expect(logs).toHaveLength(1)

    const changes = logs[0].changes as Record<string, { before?: string }>
    expect(changes.email.before).toBe('todelete@test.com')
    expect(changes.name.before).toBe('Delete Me')
  })

  it('password reset creates audit log', async () => {
    await clearAuditLogs()

    const created = await userService.create(world.admin, {
      email: 'pwreset@test.com',
      name: 'PW Reset',
      password: 'password123',
      role: 'agent',
    })

    await clearAuditLogs()

    await userService.resetPassword(world.admin, created.id)

    const logs = await getAuditLogs('user', 'reset_password')
    expect(logs).toHaveLength(1)
    expect(logs[0].userId).toBe(world.admin.id)
    expect(logs[0].resourceId).toBe(created.id)
  })

  it('password change creates audit log', async () => {
    await clearAuditLogs()

    const created = await userService.create(world.admin, {
      email: 'pwchange@test.com',
      name: 'PW Change',
      password: 'oldpass123',
      role: 'agent',
    })

    await clearAuditLogs()

    await userService.changePassword(created.id, 'oldpass123', 'newpass456')

    const logs = await getAuditLogs('user', 'change_password')
    expect(logs).toHaveLength(1)
    expect(logs[0].userId).toBe(created.id)
    expect(logs[0].resourceId).toBe(created.id)
  })
})
