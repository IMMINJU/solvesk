import { describe, it, expect } from 'vitest'
import { notificationService } from '../notification.service'

describe('NotificationService', () => {
  it('exports notificationService instance', () => {
    expect(notificationService).toBeDefined()
    expect(typeof notificationService.list).toBe('function')
    expect(typeof notificationService.markRead).toBe('function')
    expect(typeof notificationService.markAllRead).toBe('function')
    expect(typeof notificationService.unreadCount).toBe('function')
  })

  it('NotificationListItem type has required fields', () => {
    // Type-level test — if this compiles, the interface is correct
    const item: import('../notification.service').NotificationListItem = {
      id: 1,
      type: 'issue_created',
      issueId: 1,
      message: 'test',
      isRead: false,
      createdAt: new Date(),
    }
    expect(item.id).toBe(1)
    expect(item.isRead).toBe(false)
  })

  it('NotificationListResult type has pagination fields', () => {
    const result: import('../notification.service').NotificationListResult = {
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
    }
    expect(result.total).toBe(0)
    expect(result.page).toBe(1)
  })
})
