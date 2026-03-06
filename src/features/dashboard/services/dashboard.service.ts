import { db, issues, projects, projectMembers, users } from '@/db'
import { eq, and, or, sql, inArray, count } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { AuthenticatedUser } from '@/lib/permissions'

export interface DashboardStats {
  totalIssues: number
  openIssues: number
  resolvedIssues: number
  myAssigned: number
  byStatus: { status: string; count: number }[]
  byPriority: { priority: string; count: number }[]
  recentIssues: {
    id: number
    issueKey: string
    title: string
    status: string
    priority: string
    createdAt: Date
  }[]
}

class DashboardService {
  async getStats(user: AuthenticatedUser): Promise<DashboardStats> {
    // Get accessible project IDs based on role
    const projectIds = await this.getAccessibleProjectIds(user)

    if (projectIds.length === 0) {
      return this.emptyStats()
    }

    // Build access filter: project scope + customer privacy isolation
    const projectFilter = this.buildAccessFilter(user, projectIds)

    // Run queries in parallel
    const [
      totalResult,
      openResult,
      resolvedResult,
      assignedResult,
      statusResult,
      priorityResult,
      recentResult,
    ] = await Promise.all([
      // Total issues
      db.select({ count: count() }).from(issues).where(projectFilter),

      // Open issues
      db
        .select({ count: count() })
        .from(issues)
        .where(and(projectFilter, eq(issues.status, 'open'))),

      // Resolved issues
      db
        .select({ count: count() })
        .from(issues)
        .where(and(projectFilter, eq(issues.status, 'resolved'))),

      // My assigned
      db
        .select({ count: count() })
        .from(issues)
        .where(and(projectFilter, eq(issues.assigneeId, user.id))),

      // By status
      db
        .select({
          status: issues.status,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(issues)
        .where(projectFilter)
        .groupBy(issues.status),

      // By priority
      db
        .select({
          priority: issues.priority,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(issues)
        .where(projectFilter)
        .groupBy(issues.priority),

      // Recent issues (latest 5)
      db.query.issues.findMany({
        where: projectFilter,
        orderBy: (issues, { desc }) => [desc(issues.createdAt)],
        limit: 5,
        columns: {
          id: true,
          issueKey: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      }),
    ])

    return {
      totalIssues: totalResult[0].count,
      openIssues: openResult[0].count,
      resolvedIssues: resolvedResult[0].count,
      myAssigned: assignedResult[0].count,
      byStatus: statusResult,
      byPriority: priorityResult,
      recentIssues: recentResult,
    }
  }

  private async getAccessibleProjectIds(user: AuthenticatedUser): Promise<number[]> {
    if (user.role === 'admin') {
      const all = await db.select({ id: projects.id }).from(projects)
      return all.map(p => p.id)
    }

    if (user.role === 'customer') {
      return user.projectId ? [user.projectId] : []
    }

    // Agent: project_members
    const memberships = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, user.id))
    return memberships.map(m => m.projectId)
  }

  /**
   * Customer isolation: own issues OR (same project + not private)
   * Admin/Agent: all issues in accessible projects
   */
  private buildAccessFilter(user: AuthenticatedUser, projectIds: number[]): SQL {
    const projectScope = inArray(issues.projectId, projectIds)

    if (user.role === 'customer') {
      return and(projectScope, or(eq(issues.reporterId, user.id), eq(issues.isPrivate, false)))!
    }

    return projectScope
  }

  private emptyStats(): DashboardStats {
    return {
      totalIssues: 0,
      openIssues: 0,
      resolvedIssues: 0,
      myAssigned: 0,
      byStatus: [],
      byPriority: [],
      recentIssues: [],
    }
  }
}

export const dashboardService = new DashboardService()
