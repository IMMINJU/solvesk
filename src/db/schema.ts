import {
  pgTable,
  text,
  timestamp,
  varchar,
  serial,
  integer,
  pgEnum,
  index,
  uniqueIndex,
  primaryKey,
  boolean,
  jsonb,
  customType,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// Custom tsvector type for full-text search
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

type AdapterAccountType = 'oauth' | 'oidc' | 'email' | 'webauthn'

// ============================================
// Enums
// ============================================

export const userRoleEnum = pgEnum('user_role', ['admin', 'agent', 'customer'])

export const issueTypeEnum = pgEnum('issue_type', ['bug', 'feature', 'inquiry'])

export const issueStatusEnum = pgEnum('issue_status', [
  'open',
  'in_progress',
  'waiting',
  'resolved',
  'closed',
])

export const issuePriorityEnum = pgEnum('issue_priority', ['urgent', 'high', 'medium', 'low'])

export const notificationTypeEnum = pgEnum('notification_type', [
  'issue_created',
  'issue_assigned',
  'issue_status_changed',
  'issue_priority_changed',
  'comment_added',
  'issue_mentioned',
])

// ============================================
// Auth Tables (NextAuth.js)
// ============================================

export const users = pgTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: timestamp('email_verified', { mode: 'date' }),
    password: varchar('password', { length: 255 }),
    name: varchar('name', { length: 255 }),
    image: text('image'),
    role: userRoleEnum('role').default('customer').notNull(),
    projectId: integer('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    mustChangePassword: boolean('must_change_password').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    customerMustHaveProject: sql`CHECK (${table.role} != 'customer' OR ${table.projectId} IS NOT NULL)`,
  })
)

export const accounts = pgTable(
  'accounts',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  account => [primaryKey({ columns: [account.provider, account.providerAccountId] })]
)

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

// ============================================
// Core Tables
// ============================================

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 10 }).notNull().unique(),
  description: text('description'),
  issueCount: integer('issue_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const projectMembers = pgTable(
  'project_members',
  {
    projectId: integer('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    assignedBy: text('assigned_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    primaryKey({ columns: [table.projectId, table.userId] }),
    index('idx_project_members_project').on(table.projectId),
    index('idx_project_members_user').on(table.userId),
  ]
)

export const issues = pgTable(
  'issues',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    issueNumber: integer('issue_number').notNull(),
    issueKey: varchar('issue_key', { length: 20 }).notNull().unique(),
    type: issueTypeEnum('type').default('bug').notNull(),
    status: issueStatusEnum('status').default('open').notNull(),
    priority: issuePriorityEnum('priority').default('medium').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content'),
    reporterId: text('reporter_id')
      .references(() => users.id)
      .notNull(),
    assigneeId: text('assignee_id').references(() => users.id),
    isPrivate: boolean('is_private').default(false).notNull(),
    dueDate: timestamp('due_date'),
    searchVector: tsvector('search_vector'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_issues_project_status').on(table.projectId, table.status),
    index('idx_issues_assignee').on(table.assigneeId),
    index('idx_issues_reporter').on(table.reporterId),
    index('idx_issues_created_at').on(table.createdAt),
    index('idx_issues_project_priority_created').on(
      table.projectId,
      table.priority,
      table.createdAt
    ),
    index('idx_issues_due_date').on(table.dueDate),
  ]
)

export const comments = pgTable(
  'comments',
  {
    id: serial('id').primaryKey(),
    issueId: integer('issue_id')
      .references(() => issues.id, { onDelete: 'cascade' })
      .notNull(),
    content: text('content').notNull(),
    authorId: text('author_id')
      .references(() => users.id)
      .notNull(),
    isInternal: boolean('is_internal').default(false).notNull(),
    searchVector: tsvector('search_vector'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_comments_issue').on(table.issueId),
    index('idx_comments_created_at').on(table.createdAt),
  ]
)

export const labels = pgTable(
  'labels',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 50 }).notNull(),
    color: varchar('color', { length: 7 }).notNull(),
    description: text('description'),
    createdBy: text('created_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [uniqueIndex('idx_labels_unique_name').on(table.name)]
)

export const issueLabels = pgTable(
  'issue_labels',
  {
    issueId: integer('issue_id')
      .references(() => issues.id, { onDelete: 'cascade' })
      .notNull(),
    labelId: integer('label_id')
      .references(() => labels.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    primaryKey({ columns: [table.issueId, table.labelId] }),
    index('idx_issue_labels_issue').on(table.issueId),
    index('idx_issue_labels_label').on(table.labelId),
  ]
)

export const attachments = pgTable('attachments', {
  id: serial('id').primaryKey(),
  issueId: integer('issue_id').references(() => issues.id, {
    onDelete: 'cascade',
  }),
  commentId: integer('comment_id').references(() => comments.id, {
    onDelete: 'cascade',
  }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  uploadedBy: text('uploaded_by')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ============================================
// System Tables
// ============================================

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    type: notificationTypeEnum('type').notNull(),
    issueId: integer('issue_id').references(() => issues.id, {
      onDelete: 'cascade',
    }),
    message: text('message').notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('idx_notifications_user_unread').on(table.userId, table.isRead),
    index('idx_notifications_created_at').on(table.createdAt),
  ]
)

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id').notNull(),
    changes: jsonb('changes').$type<Record<string, { before?: unknown; after?: unknown }>>(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('idx_audit_logs_user').on(table.userId),
    index('idx_audit_logs_resource').on(table.resourceType, table.resourceId),
    index('idx_audit_logs_created_at').on(table.createdAt),
  ]
)

// ============================================
// Relations
// ============================================

export const usersRelations = relations(users, ({ one, many }) => ({
  project: one(projects, {
    fields: [users.projectId],
    references: [projects.id],
  }),
  accounts: many(accounts),
  sessions: many(sessions),
  reportedIssues: many(issues, { relationName: 'reporter' }),
  assignedIssues: many(issues, { relationName: 'assignee' }),
  comments: many(comments),
  notifications: many(notifications),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const projectsRelations = relations(projects, ({ many }) => ({
  users: many(users),
  issues: many(issues),
  projectMembers: many(projectMembers),
}))

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}))

export const issuesRelations = relations(issues, ({ one, many }) => ({
  project: one(projects, {
    fields: [issues.projectId],
    references: [projects.id],
  }),
  reporter: one(users, {
    fields: [issues.reporterId],
    references: [users.id],
    relationName: 'reporter',
  }),
  assignee: one(users, {
    fields: [issues.assigneeId],
    references: [users.id],
    relationName: 'assignee',
  }),
  comments: many(comments),
  attachments: many(attachments),
  issueLabels: many(issueLabels),
}))

export const commentsRelations = relations(comments, ({ one, many }) => ({
  issue: one(issues, {
    fields: [comments.issueId],
    references: [issues.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  attachments: many(attachments),
}))

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  issue: one(issues, {
    fields: [attachments.issueId],
    references: [issues.id],
  }),
  comment: one(comments, {
    fields: [attachments.commentId],
    references: [comments.id],
  }),
  uploader: one(users, {
    fields: [attachments.uploadedBy],
    references: [users.id],
  }),
}))

export const labelsRelations = relations(labels, ({ one, many }) => ({
  creator: one(users, {
    fields: [labels.createdBy],
    references: [users.id],
  }),
  issueLabels: many(issueLabels),
}))

export const issueLabelsRelations = relations(issueLabels, ({ one }) => ({
  issue: one(issues, {
    fields: [issueLabels.issueId],
    references: [issues.id],
  }),
  label: one(labels, {
    fields: [issueLabels.labelId],
    references: [labels.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  issue: one(issues, {
    fields: [notifications.issueId],
    references: [issues.id],
  }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}))
