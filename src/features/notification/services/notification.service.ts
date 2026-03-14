import { db, notifications } from '@/db'
import { eq, and, count, desc } from 'drizzle-orm'
import type { AuthenticatedUser } from '@/lib/permissions'
import { PAGINATION } from '@/config/limits'

export interface NotificationListItem {
  id: number
  type: string
  issueId: number | null
  message: string
  isRead: boolean
  createdAt: Date
}

export interface NotificationListResult {
  data: NotificationListItem[]
  total: number
  page: number
  pageSize: number
}

class NotificationService {
  async list(
    user: AuthenticatedUser,
    params: { page?: number; pageSize?: number } = {}
  ): Promise<NotificationListResult> {
    const page = params.page ?? 1
    const pageSize = Math.min(params.pageSize ?? PAGINATION.defaultPageSize, PAGINATION.maxPageSize)

    const [totalResult] = await db
      .select({ count: count() })
      .from(notifications)
      .where(eq(notifications.userId, user.id))

    const data = await db.query.notifications.findMany({
      where: eq(notifications.userId, user.id),
      columns: {
        id: true,
        type: true,
        issueId: true,
        message: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: [desc(notifications.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    })

    return {
      data: data as NotificationListItem[],
      total: totalResult.count,
      page,
      pageSize,
    }
  }

  async markAllRead(user: AuthenticatedUser): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)))
  }

  async markRead(user: AuthenticatedUser, notificationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)))
  }

  async deleteAll(user: AuthenticatedUser): Promise<void> {
    await db.delete(notifications).where(eq(notifications.userId, user.id))
  }

  async deleteById(user: AuthenticatedUser, notificationId: number): Promise<void> {
    await db
      .delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)))
  }

  async unreadCount(user: AuthenticatedUser): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)))
    return result.count
  }
}

export const notificationService = new NotificationService()
