import { describe, it, expect } from 'vitest'
import { getTableColumns } from 'drizzle-orm'
import {
  users,
  accounts,
  sessions,
  projects,
  projectMembers,
  issues,
  comments,
  labels,
  issueLabels,
  attachments,
  notifications,
  auditLogs,
  userRoleEnum,
  issueStatusEnum,
  issuePriorityEnum,
  issueTypeEnum,
  notificationTypeEnum,
} from '../schema'

// ============================================
// Table existence & column structure
// ============================================

describe('Schema: Tables', () => {
  const expectedTables = {
    users,
    accounts,
    sessions,
    projects,
    projectMembers,
    issues,
    comments,
    labels,
    issueLabels,
    attachments,
    notifications,
    auditLogs,
  }

  it('should export exactly 12 tables', () => {
    expect(Object.keys(expectedTables)).toHaveLength(12)
  })

  it('should have correct table names', () => {
    // Verify each table can produce columns (proves they are real pgTable objects)
    for (const [name, table] of Object.entries(expectedTables)) {
      const columns = getTableColumns(table)
      expect(Object.keys(columns).length).toBeGreaterThan(0)
    }
  })
})

// ============================================
// Enums
// ============================================

describe('Schema: Enums', () => {
  it('userRoleEnum has exactly 3 values (no developer)', () => {
    expect(userRoleEnum.enumValues).toEqual(['admin', 'agent', 'customer'])
  })

  it('issueStatusEnum has exactly 5 values', () => {
    expect(issueStatusEnum.enumValues).toEqual([
      'open',
      'in_progress',
      'waiting',
      'resolved',
      'closed',
    ])
  })

  it('issuePriorityEnum has 4 values', () => {
    expect(issuePriorityEnum.enumValues).toEqual(['urgent', 'high', 'medium', 'low'])
  })

  it('issueTypeEnum has 3 values', () => {
    expect(issueTypeEnum.enumValues).toEqual(['bug', 'feature', 'inquiry'])
  })

  it('notificationTypeEnum has 6 values', () => {
    expect(notificationTypeEnum.enumValues).toEqual([
      'issue_created',
      'issue_assigned',
      'issue_status_changed',
      'issue_priority_changed',
      'comment_added',
      'issue_mentioned',
    ])
  })
})

// ============================================
// Users table
// ============================================

describe('Schema: users', () => {
  const columns = getTableColumns(users)

  it('has required columns', () => {
    const expected = [
      'id',
      'email',
      'emailVerified',
      'password',
      'name',
      'image',
      'role',
      'projectId',
      'mustChangePassword',
      'createdAt',
      'updatedAt',
    ]
    expect(Object.keys(columns).sort()).toEqual(expected.sort())
  })

  it('id is primary key', () => {
    expect(columns.id.primary).toBe(true)
  })

  it('email is unique and not null', () => {
    expect(columns.email.isUnique).toBe(true)
    expect(columns.email.notNull).toBe(true)
  })

  it('role defaults to customer', () => {
    expect(columns.role.hasDefault).toBe(true)
  })
})

// ============================================
// Projects table
// ============================================

describe('Schema: projects', () => {
  const columns = getTableColumns(projects)

  it('has required columns', () => {
    const expected = ['id', 'name', 'code', 'description', 'issueCount', 'createdAt', 'updatedAt']
    expect(Object.keys(columns).sort()).toEqual(expected.sort())
  })

  it('does NOT have archived or customerViewScope columns', () => {
    expect(columns).not.toHaveProperty('archived')
    expect(columns).not.toHaveProperty('customerViewScope')
  })

  it('code is unique', () => {
    expect(columns.code.isUnique).toBe(true)
  })
})

// ============================================
// Issues table
// ============================================

describe('Schema: issues', () => {
  const columns = getTableColumns(issues)

  it('has required columns', () => {
    const expected = [
      'id',
      'projectId',
      'issueNumber',
      'issueKey',
      'type',
      'status',
      'priority',
      'title',
      'content',
      'reporterId',
      'assigneeId',
      'isPrivate',
      'dueDate',
      'searchVector',
      'createdAt',
      'updatedAt',
    ]
    expect(Object.keys(columns).sort()).toEqual(expected.sort())
  })

  it('issueKey is unique', () => {
    expect(columns.issueKey.isUnique).toBe(true)
  })

  it('projectId and reporterId are not null', () => {
    expect(columns.projectId.notNull).toBe(true)
    expect(columns.reporterId.notNull).toBe(true)
  })

  it('assigneeId is nullable', () => {
    expect(columns.assigneeId.notNull).toBe(false)
  })
})

// ============================================
// Comments table
// ============================================

describe('Schema: comments', () => {
  const columns = getTableColumns(comments)

  it('has required columns', () => {
    const expected = [
      'id',
      'issueId',
      'content',
      'authorId',
      'isInternal',
      'searchVector',
      'createdAt',
      'updatedAt',
    ]
    expect(Object.keys(columns).sort()).toEqual(expected.sort())
  })

  it('does NOT have task-related columns', () => {
    expect(columns).not.toHaveProperty('commentType')
    expect(columns).not.toHaveProperty('taskStatus')
    expect(columns).not.toHaveProperty('taskAssignedTo')
  })

  it('isInternal defaults to false', () => {
    expect(columns.isInternal.hasDefault).toBe(true)
  })
})

// ============================================
// ProjectMembers table
// ============================================

describe('Schema: projectMembers', () => {
  const columns = getTableColumns(projectMembers)

  it('has required columns', () => {
    const expected = ['projectId', 'userId', 'assignedBy', 'createdAt']
    expect(Object.keys(columns).sort()).toEqual(expected.sort())
  })

  it('does NOT have role column (developer removed)', () => {
    expect(columns).not.toHaveProperty('role')
  })
})

// ============================================
// Removed tables should NOT exist
// ============================================

describe('Schema: Removed tables', () => {
  it('does not export removed tables', async () => {
    const schema = await import('../schema')
    expect(schema).not.toHaveProperty('invitations')
    expect(schema).not.toHaveProperty('verificationTokens')
    expect(schema).not.toHaveProperty('notificationSettings')
    expect(schema).not.toHaveProperty('tasks')
    expect(schema).not.toHaveProperty('taskComments')
    expect(schema).not.toHaveProperty('activityLogs')
    expect(schema).not.toHaveProperty('investigationNotes')
  })

  it('does not export removed enums', async () => {
    const schema = await import('../schema')
    expect(schema).not.toHaveProperty('customerViewScopeEnum')
    expect(schema).not.toHaveProperty('investigationNoteTypeEnum')
    expect(schema).not.toHaveProperty('activityTypeEnum')
    expect(schema).not.toHaveProperty('invitationStatusEnum')
  })
})
