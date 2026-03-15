/**
 * Seed logic — shared between CLI (seed.ts) and API (cron/reset)
 */
import { db } from '../db'
import {
  users,
  projects,
  projectMembers,
  issues,
  comments,
  labels,
  issueLabels,
  notifications,
  auditLogs,
  attachments,
} from '../db/schema'
import { hashPassword } from '../lib/auth-options'
import { sql } from 'drizzle-orm'

export async function seedDatabase() {
  // Clean existing data (reverse FK order)
  await db.delete(auditLogs)
  await db.delete(notifications)
  await db.delete(attachments)
  await db.delete(issueLabels)
  await db.delete(comments)
  await db.delete(issues)
  await db.delete(labels)
  await db.delete(projectMembers)
  await db.execute(sql`UPDATE users SET project_id = NULL WHERE project_id IS NOT NULL`)
  await db.delete(projects)
  await db.delete(users)

  // ── Projects ──────────────────────────────────
  const [acme, glx] = await db
    .insert(projects)
    .values([
      {
        name: 'Acme Corp',
        code: 'ACME',
        description: 'Acme Corporation helpdesk',
      },
      {
        name: 'Globex Inc',
        code: 'GLX',
        description: 'Globex Inc support portal',
      },
    ])
    .returning()

  // ── Users ─────────────────────────────────────
  const pw = await hashPassword('password123')

  const [admin, agent1, agent2, cust1, cust2] = await db
    .insert(users)
    .values([
      {
        email: 'admin@demo.com',
        name: 'Admin User',
        password: pw,
        role: 'admin',
      },
      {
        email: 'agent1@demo.com',
        name: 'Alice Agent',
        password: pw,
        role: 'agent',
      },
      {
        email: 'agent2@demo.com',
        name: 'Bob Agent',
        password: pw,
        role: 'agent',
      },
      {
        email: 'customer1@demo.com',
        name: 'Charlie Customer',
        password: pw,
        role: 'customer',
        projectId: acme.id,
      },
      {
        email: 'customer2@demo.com',
        name: 'Diana Customer',
        password: pw,
        role: 'customer',
        projectId: glx.id,
      },
    ])
    .returning()

  // ── Project Members (Agent assignments) ───────
  await db.insert(projectMembers).values([
    { projectId: acme.id, userId: agent1.id, assignedBy: admin.id },
    { projectId: glx.id, userId: agent1.id, assignedBy: admin.id },
    { projectId: acme.id, userId: agent2.id, assignedBy: admin.id },
  ])

  // ── Labels ────────────────────────────────────
  const [bugLabel, featureLabel, questionLabel, urgentLabel, docsLabel] = await db
    .insert(labels)
    .values([
      { name: 'bug', color: '#eb5757', createdBy: admin.id },
      { name: 'feature', color: '#2f80ed', createdBy: admin.id },
      { name: 'question', color: '#9b51e0', createdBy: admin.id },
      { name: 'urgent', color: '#f2994a', createdBy: admin.id },
      { name: 'documentation', color: '#27ae60', createdBy: admin.id },
    ])
    .returning()

  // ── Issues (ACME: 5, GLX: 3) ─────────────────
  await db
    .insert(issues)
    .values([
      // ACME issues
      {
        projectId: acme.id,
        issueNumber: 1,
        issueKey: 'ACME-1',
        type: 'bug',
        status: 'open',
        priority: 'high',
        title: 'Login page returns 500 error on mobile',
        content:
          '<p>When trying to log in from a mobile browser, the login page crashes with a 500 error. Steps to reproduce: open the login page on iPhone Safari, enter credentials, tap Sign In.</p>',
        reporterId: cust1.id,
        assigneeId: agent1.id,
      },
      {
        projectId: acme.id,
        issueNumber: 2,
        issueKey: 'ACME-2',
        type: 'feature',
        status: 'in_progress',
        priority: 'medium',
        title: 'Add CSV export for reports',
        content:
          '<p>We need the ability to export dashboard reports as CSV files. This would help our team analyze data in spreadsheet tools.</p>',
        reporterId: cust1.id,
        assigneeId: agent2.id,
      },
      {
        projectId: acme.id,
        issueNumber: 3,
        issueKey: 'ACME-3',
        type: 'inquiry',
        status: 'waiting',
        priority: 'low',
        title: 'How to configure email notifications?',
        content:
          "<p>I'd like to set up email notifications for our team. Where can I find the configuration options?</p>",
        reporterId: cust1.id,
        assigneeId: agent1.id,
      },
      {
        projectId: acme.id,
        issueNumber: 4,
        issueKey: 'ACME-4',
        type: 'bug',
        status: 'resolved',
        priority: 'urgent',
        title: 'Data loss when saving large forms',
        content:
          '<p>When submitting forms with more than 50 fields, some data is silently dropped. This is critical for our onboarding workflow.</p>',
        reporterId: cust1.id,
        assigneeId: agent1.id,
      },
      {
        projectId: acme.id,
        issueNumber: 5,
        issueKey: 'ACME-5',
        type: 'feature',
        status: 'closed',
        priority: 'medium',
        title: 'Dark mode support',
        content:
          '<p>Please add dark mode support. Many of our team members prefer working in dark mode, especially during evening shifts.</p>',
        reporterId: cust1.id,
        isPrivate: true,
      },
      // GLX issues
      {
        projectId: glx.id,
        issueNumber: 1,
        issueKey: 'GLX-1',
        type: 'bug',
        status: 'open',
        priority: 'high',
        title: 'API rate limiting too aggressive',
        content:
          "<p>Our integration is being rate limited even with normal usage patterns. We're seeing 429 errors after just 5 requests per second.</p>",
        reporterId: cust2.id,
        assigneeId: agent1.id,
      },
      {
        projectId: glx.id,
        issueNumber: 2,
        issueKey: 'GLX-2',
        type: 'feature',
        status: 'open',
        priority: 'medium',
        title: 'Webhook support for status changes',
        content:
          "<p>We'd like to receive webhook notifications when issue statuses change, so we can update our internal tracking system automatically.</p>",
        reporterId: cust2.id,
      },
      {
        projectId: glx.id,
        issueNumber: 3,
        issueKey: 'GLX-3',
        type: 'inquiry',
        status: 'resolved',
        priority: 'low',
        title: 'Clarification on SLA response times',
        content:
          '<p>Could you clarify the expected response times for different priority levels? Our team needs this for internal documentation.</p>',
        reporterId: cust2.id,
        assigneeId: agent1.id,
      },
    ])
    .returning()

  // Update project issue counts
  await db.execute(sql`UPDATE projects SET issue_count = 5 WHERE id = ${acme.id}`)
  await db.execute(sql`UPDATE projects SET issue_count = 3 WHERE id = ${glx.id}`)

  // ── Issue Labels ──────────────────────────────
  const allIssues = await db.select().from(issues)
  const issueMap = Object.fromEntries(allIssues.map(i => [i.issueKey, i]))

  await db.insert(issueLabels).values([
    { issueId: issueMap['ACME-1'].id, labelId: bugLabel.id },
    { issueId: issueMap['ACME-2'].id, labelId: featureLabel.id },
    { issueId: issueMap['ACME-3'].id, labelId: questionLabel.id },
    { issueId: issueMap['ACME-4'].id, labelId: bugLabel.id },
    { issueId: issueMap['ACME-4'].id, labelId: urgentLabel.id },
    { issueId: issueMap['ACME-5'].id, labelId: featureLabel.id },
    { issueId: issueMap['GLX-1'].id, labelId: bugLabel.id },
    { issueId: issueMap['GLX-2'].id, labelId: featureLabel.id },
    { issueId: issueMap['GLX-3'].id, labelId: questionLabel.id },
    { issueId: issueMap['GLX-3'].id, labelId: docsLabel.id },
  ])

  // ── Comments ──────────────────────────────────
  await db.insert(comments).values([
    {
      issueId: issueMap['ACME-1'].id,
      content:
        '<p>I can reproduce this on Chrome mobile as well. Looking into the server logs now.</p>',
      authorId: agent1.id,
    },
    {
      issueId: issueMap['ACME-1'].id,
      content:
        '<p>Internal: The issue is caused by a missing viewport meta tag in the login template. Fix is in progress.</p>',
      authorId: agent1.id,
      isInternal: true,
    },
    {
      issueId: issueMap['ACME-4'].id,
      content:
        "<p>We've identified the root cause. The form submission payload was being truncated at 1MB. We've increased the limit to 10MB.</p>",
      authorId: agent1.id,
    },
    {
      issueId: issueMap['ACME-4'].id,
      content: "<p>Thank you for the quick fix! We've tested and confirmed it's working now.</p>",
      authorId: cust1.id,
    },
    {
      issueId: issueMap['GLX-1'].id,
      content:
        "<p>Could you share your API usage patterns? We'd like to understand if this is expected behavior or if we need to adjust the limits.</p>",
      authorId: agent1.id,
    },
    {
      issueId: issueMap['GLX-3'].id,
      content:
        '<p>Our standard SLA response times are: Urgent (1h), High (4h), Medium (8h), Low (24h).</p>',
      authorId: agent1.id,
    },
  ])

  // ── Notifications ─────────────────────────────
  await db.insert(notifications).values([
    {
      userId: agent1.id,
      type: 'issue_created',
      issueId: issueMap['ACME-1'].id,
      message: 'New issue: Login page returns 500 error on mobile',
    },
    {
      userId: agent1.id,
      type: 'issue_assigned',
      issueId: issueMap['GLX-1'].id,
      message: 'You were assigned to: API rate limiting too aggressive',
    },
    {
      userId: cust1.id,
      type: 'comment_added',
      issueId: issueMap['ACME-4'].id,
      message: 'Alice Agent commented on: Data loss when saving large forms',
      isRead: true,
    },
  ])
}
