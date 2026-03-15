/**
 * Integration test fixtures — real DB data factories
 *
 * Topology (mirrors seed):
 *   projectA (ACME) — agent1, agent2, customer1
 *   projectB (GLX)  — agent1, customer2
 *
 * All services accept AuthenticatedUser directly, so we bypass NextAuth.
 */
import { db, users, projects, projectMembers, issues, comments, labels, issueLabels } from '@/db'
import { eq, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import type { AuthenticatedUser } from '@/lib/permissions'

// Pre-hashed password — bcrypt is slow, hash once and reuse
let cachedHash: string | null = null
async function getPasswordHash(): Promise<string> {
  if (!cachedHash) {
    cachedHash = await bcrypt.hash('password123', 4) // Low rounds for speed
  }
  return cachedHash
}

export interface TestWorld {
  projectA: typeof projects.$inferSelect
  projectB: typeof projects.$inferSelect
  admin: AuthenticatedUser
  agent1: AuthenticatedUser
  agent2: AuthenticatedUser
  customer1: AuthenticatedUser
  customer2: AuthenticatedUser
}

/**
 * Insert the full test world: 2 projects, 5 users, membership assignments.
 * Returns typed AuthenticatedUser objects ready for service calls.
 */
export async function createTestWorld(): Promise<TestWorld> {
  const pw = await getPasswordHash()

  // Projects
  const [projectA, projectB] = await db
    .insert(projects)
    .values([
      { name: 'Acme Corp', code: 'ACME', description: 'Test project A' },
      { name: 'Globex Inc', code: 'GLX', description: 'Test project B' },
    ])
    .returning()

  // Users
  const [adminRow, agent1Row, agent2Row, customer1Row, customer2Row] = await db
    .insert(users)
    .values([
      { email: 'admin@test.com', name: 'Admin User', password: pw, role: 'admin' },
      { email: 'agent1@test.com', name: 'Alice Agent', password: pw, role: 'agent' },
      { email: 'agent2@test.com', name: 'Bob Agent', password: pw, role: 'agent' },
      {
        email: 'customer1@test.com',
        name: 'Charlie Customer',
        password: pw,
        role: 'customer',
        projectId: projectA.id,
      },
      {
        email: 'customer2@test.com',
        name: 'Diana Customer',
        password: pw,
        role: 'customer',
        projectId: projectB.id,
      },
    ])
    .returning()

  // Agent → Project assignments
  await db.insert(projectMembers).values([
    { projectId: projectA.id, userId: agent1Row.id, assignedBy: adminRow.id },
    { projectId: projectB.id, userId: agent1Row.id, assignedBy: adminRow.id },
    { projectId: projectA.id, userId: agent2Row.id, assignedBy: adminRow.id },
    // agent2 is NOT assigned to projectB
  ])

  return {
    projectA,
    projectB,
    admin: toAuthUser(adminRow),
    agent1: toAuthUser(agent1Row),
    agent2: toAuthUser(agent2Row),
    customer1: toAuthUser(customer1Row),
    customer2: toAuthUser(customer2Row),
  }
}

function toAuthUser(row: typeof users.$inferSelect): AuthenticatedUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as AuthenticatedUser['role'],
    projectId: row.projectId,
    image: row.image,
  }
}

// ── Issue factory ─────────────────────────────────────

interface CreateIssueOptions {
  projectId: number
  reporterId: string
  assigneeId?: string | null
  title?: string
  content?: string
  status?: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
  priority?: 'urgent' | 'high' | 'medium' | 'low'
  type?: 'bug' | 'feature' | 'inquiry'
  isPrivate?: boolean
  dueDate?: Date | null
}

/**
 * Create an issue directly in DB (bypasses service for fixture speed).
 * Handles issueKey generation and project issueCount increment.
 */
export async function createIssue(opts: CreateIssueOptions) {
  const result = await db.transaction(async tx => {
    const [lockedProject] = await tx.execute(
      sql`SELECT * FROM projects WHERE id = ${opts.projectId} FOR UPDATE`
    )
    const newNumber = (lockedProject.issue_count as number) + 1
    const issueKey = `${lockedProject.code}-${newNumber}`

    await tx.update(projects).set({ issueCount: newNumber }).where(eq(projects.id, opts.projectId))

    const [issue] = await tx
      .insert(issues)
      .values({
        projectId: opts.projectId,
        issueNumber: newNumber,
        issueKey,
        title: opts.title ?? `Test issue ${issueKey}`,
        content: opts.content ?? '<p>Test content</p>',
        status: opts.status ?? 'open',
        priority: opts.priority ?? 'medium',
        type: opts.type ?? 'bug',
        reporterId: opts.reporterId,
        assigneeId: opts.assigneeId ?? null,
        isPrivate: opts.isPrivate ?? false,
        dueDate: opts.dueDate ?? null,
      })
      .returning()

    return issue
  })

  return result
}

// ── Comment factory ───────────────────────────────────

interface CreateCommentOptions {
  issueId: number
  authorId: string
  content?: string
  isInternal?: boolean
}

export async function createComment(opts: CreateCommentOptions) {
  const [comment] = await db
    .insert(comments)
    .values({
      issueId: opts.issueId,
      content: opts.content ?? '<p>Test comment</p>',
      authorId: opts.authorId,
      isInternal: opts.isInternal ?? false,
    })
    .returning()

  return comment
}

// ── Label factory ─────────────────────────────────────

export async function createLabel(name: string, color: string, createdBy: string) {
  const [label] = await db.insert(labels).values({ name, color, createdBy }).returning()
  return label
}

export async function addLabelToIssue(issueId: number, labelId: number) {
  await db.insert(issueLabels).values({ issueId, labelId })
}
