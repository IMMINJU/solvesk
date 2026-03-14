import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query-keys'
import { PAGINATION } from '@/config/limits'
import type { PaginatedResponse } from '@/lib/api/types'
import type { NotificationListItem } from '@/features/notification/services/notification.service'

export function useNotifications(page = 1) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', String(PAGINATION.defaultPageSize))

  return useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: () =>
      api.get<PaginatedResponse<NotificationListItem>>(`/api/notifications?${params.toString()}`),
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => api.get<{ count: number }>('/api/notifications/unread-count'),
    refetchInterval: 30_000,
  })
}
