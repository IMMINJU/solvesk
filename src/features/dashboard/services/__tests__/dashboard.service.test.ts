import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DashboardStats } from '../dashboard.service'
import type { AuthenticatedUser } from '@/lib/permissions'

// ============================================
// Mock setup — queue-based chainable mock
// ============================================

let callIndex = 0
const selectResults: unknown[] = []
const mockFindMany = vi.fn()

// Each db.select() call creates a fresh chain that resolves to selectResults[callIndex++]
function makeSelectChain() {
  const idx = callIndex++
  const resolve = () => selectResults[idx]
  const thennable = {
    groupBy: () => ({
      then: (res: (v: unknown) => void, _rej?: (e: unknown) => void) => res(resolve()),
    }),
    then: (res: (v: unknown) => void, _rej?: (e: unknown) => void) => res(resolve()),
  }
  return {
    from: () => ({
      where: () => thennable,
      // For admin: db.select().from(projects) with no .where()
      then: (res: (v: unknown) => void, _rej?: (e: unknown) => void) => res(resolve()),
    }),
  }
}

vi.mock('@/db', () => ({
  db: {
    select: () => makeSelectChain(),
    query: {
      issues: {
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
    },
  },
  issues: {
    id: 'issues.id',
    projectId: 'issues.projectId',
    status: 'issues.status',
    priority: 'issues.priority',
    assigneeId: 'issues.assigneeId',
    createdAt: 'issues.createdAt',
  },
  projects: { id: 'projects.id' },
  projectMembers: { projectId: 'projectMembers.projectId', userId: 'projectMembers.userId' },
  users: { id: 'users.id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args,
  or: (...args: unknown[]) => ({ _or: args }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => `sql:${strings.join('')}`,
  inArray: (...args: unknown[]) => args,
  count: () => 'count',
}))

// ============================================
// Test data
// ============================================

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  email: 'admin@test.com',
  name: 'Admin',
  role: 'admin',
  projectId: null,
  image: null,
}

const agentUser: AuthenticatedUser = {
  id: 'agent-1',
  email: 'agent@test.com',
  name: 'Agent',
  role: 'agent',
  projectId: null,
  image: null,
}

const customerUser: AuthenticatedUser = {
  id: 'customer-1',
  email: 'customer@test.com',
  name: 'Customer',
  role: 'customer',
  projectId: 1,
  image: null,
}

const customerNoProject: AuthenticatedUser = {
  id: 'customer-2',
  email: 'customer2@test.com',
  name: 'Customer No Project',
  role: 'customer',
  projectId: null,
  image: null,
}

// ============================================
// Type tests
// ============================================

describe('DashboardStats type', () => {
  it('has required numeric fields', () => {
    const stats: DashboardStats = {
      totalIssues: 100,
      openIssues: 30,
      resolvedIssues: 50,
      myAssigned: 10,
      byStatus: [],
      byPriority: [],
      recentIssues: [],
    }
    expect(stats.totalIssues).toBe(100)
    expect(stats.openIssues).toBe(30)
    expect(stats.resolvedIssues).toBe(50)
    expect(stats.myAssigned).toBe(10)
  })

  it('has byStatus breakdown', () => {
    const stats: DashboardStats = {
      totalIssues: 5,
      openIssues: 2,
      resolvedIssues: 1,
      myAssigned: 0,
      byStatus: [
        { status: 'open', count: 2 },
        { status: 'in_progress', count: 1 },
        { status: 'resolved', count: 1 },
        { status: 'closed', count: 1 },
      ],
      byPriority: [],
      recentIssues: [],
    }
    expect(stats.byStatus).toHaveLength(4)
  })

  it('has byPriority breakdown', () => {
    const stats: DashboardStats = {
      totalIssues: 3,
      openIssues: 1,
      resolvedIssues: 1,
      myAssigned: 0,
      byStatus: [],
      byPriority: [
        { priority: 'urgent', count: 1 },
        { priority: 'high', count: 1 },
        { priority: 'low', count: 1 },
      ],
      recentIssues: [],
    }
    expect(stats.byPriority).toHaveLength(3)
  })

  it('has recentIssues with correct shape', () => {
    const stats: DashboardStats = {
      totalIssues: 1,
      openIssues: 1,
      resolvedIssues: 0,
      myAssigned: 0,
      byStatus: [],
      byPriority: [],
      recentIssues: [
        {
          id: 1,
          issueKey: 'PROJ-1',
          title: 'Test Issue',
          status: 'open',
          priority: 'medium',
          createdAt: new Date(),
        },
      ],
    }
    expect(stats.recentIssues).toHaveLength(1)
    expect(stats.recentIssues[0].issueKey).toBe('PROJ-1')
  })
})

// ============================================
// Service method tests
// ============================================

describe('DashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    callIndex = 0
    selectResults.length = 0
  })

  describe('getStats — role-based project access', () => {
    it('admin gets stats for all projects', async () => {
      const { dashboardService } = await import('../dashboard.service')

      // Call 0: getAccessibleProjectIds — db.select().from(projects) (no .where)
      // Calls 1-6: the 6 select queries in Promise.all
      // Call 7 is findMany (separate mock)
      selectResults.push(
        [{ id: 1 }, { id: 2 }, { id: 3 }], // projects
        [{ count: 10 }], // total
        [{ count: 3 }], // open
        [{ count: 4 }], // resolved
        [{ count: 2 }], // assigned
        [{ status: 'open', count: 3 }], // byStatus
        [{ priority: 'high', count: 5 }] // byPriority
      )
      mockFindMany.mockResolvedValueOnce([])

      const result = await dashboardService.getStats(adminUser)
      expect(result.totalIssues).toBe(10)
      expect(result.openIssues).toBe(3)
      expect(result.resolvedIssues).toBe(4)
      expect(result.myAssigned).toBe(2)
      expect(result.byStatus).toEqual([{ status: 'open', count: 3 }])
      expect(result.byPriority).toEqual([{ priority: 'high', count: 5 }])
    })

    it('customer with no projectId gets empty stats', async () => {
      const { dashboardService } = await import('../dashboard.service')

      const result = await dashboardService.getStats(customerNoProject)
      expect(result.totalIssues).toBe(0)
      expect(result.openIssues).toBe(0)
      expect(result.resolvedIssues).toBe(0)
      expect(result.myAssigned).toBe(0)
      expect(result.byStatus).toEqual([])
      expect(result.byPriority).toEqual([])
      expect(result.recentIssues).toEqual([])
    })

    it('customer gets stats scoped to own project', async () => {
      const { dashboardService } = await import('../dashboard.service')

      // No getAccessibleProjectIds DB call for customer (uses user.projectId directly)
      // Calls 0-5: the 6 select queries
      selectResults.push(
        [{ count: 5 }], // total
        [{ count: 2 }], // open
        [{ count: 1 }], // resolved
        [{ count: 0 }], // assigned
        [], // byStatus
        [] // byPriority
      )
      mockFindMany.mockResolvedValueOnce([])

      const result = await dashboardService.getStats(customerUser)
      expect(result.totalIssues).toBe(5)
      expect(result.openIssues).toBe(2)
      expect(result.resolvedIssues).toBe(1)
    })

    it('agent with no project memberships gets empty stats', async () => {
      const { dashboardService } = await import('../dashboard.service')

      // getAccessibleProjectIds: agent queries project_members → empty
      selectResults.push([])

      const result = await dashboardService.getStats(agentUser)
      expect(result.totalIssues).toBe(0)
      expect(result.recentIssues).toEqual([])
    })

    it('agent gets stats for assigned projects only', async () => {
      const { dashboardService } = await import('../dashboard.service')

      // Call 0: getAccessibleProjectIds
      // Calls 1-6: the 6 select queries
      selectResults.push(
        [{ projectId: 1 }, { projectId: 2 }], // memberships
        [{ count: 8 }], // total
        [{ count: 3 }], // open
        [{ count: 2 }], // resolved
        [{ count: 4 }], // assigned
        [
          { status: 'open', count: 3 },
          { status: 'resolved', count: 2 },
        ],
        [
          { priority: 'high', count: 4 },
          { priority: 'medium', count: 4 },
        ]
      )
      mockFindMany.mockResolvedValueOnce([
        {
          id: 1,
          issueKey: 'PROJ-1',
          title: 'Issue 1',
          status: 'open',
          priority: 'high',
          createdAt: new Date(),
        },
      ])

      const result = await dashboardService.getStats(agentUser)
      expect(result.totalIssues).toBe(8)
      expect(result.openIssues).toBe(3)
      expect(result.myAssigned).toBe(4)
      expect(result.byStatus).toHaveLength(2)
      expect(result.byPriority).toHaveLength(2)
      expect(result.recentIssues).toHaveLength(1)
    })
  })

  describe('getStats — empty stats shape', () => {
    it('returns correct empty stats structure', async () => {
      const { dashboardService } = await import('../dashboard.service')

      const result = await dashboardService.getStats(customerNoProject)
      expect(result).toEqual({
        totalIssues: 0,
        openIssues: 0,
        resolvedIssues: 0,
        myAssigned: 0,
        byStatus: [],
        byPriority: [],
        recentIssues: [],
      })
    })
  })
})

// ============================================
// Customer privacy isolation test
// ============================================

describe('DashboardService — customer privacy isolation', () => {
  it('buildAccessFilter includes isPrivate + reporterId filter for customers', async () => {
    // Structural test: verify the source contains customer privacy filter
    const fs = await import('fs')
    const path = await import('path')
    const source = fs.readFileSync(path.resolve(__dirname, '../dashboard.service.ts'), 'utf-8')

    // Must have customer-specific filter with isPrivate check
    expect(source).toContain('isPrivate')
    expect(source).toContain('reporterId')
    // Must use or() to combine own issues + public issues
    expect(source).toContain('or(')
    // Must scope to customer role
    expect(source).toContain("role === 'customer'")
  })
})

// ============================================
// Export test
// ============================================

describe('dashboardService export', () => {
  it('exports dashboardService singleton', async () => {
    const { dashboardService } = await import('../dashboard.service')
    expect(dashboardService).toBeDefined()
    expect(typeof dashboardService.getStats).toBe('function')
  })
})
