'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useNotifications } from '@/features/notification/hooks/use-notifications'
import {
  useMarkRead,
  useMarkAllRead,
  useDeleteNotification,
  useDeleteAllNotifications,
} from '@/features/notification/hooks/use-notification-mutations'
import { BounceLoader } from '@/components/ui/bounce-loader'
import { Button } from '@/components/ui/button'
import { Bell, CheckCheck, Trash2, AlertCircle } from 'lucide-react'
import type { NotificationListItem } from '@/features/notification/services/notification.service'

type FilterState = 'all' | 'unread' | 'read'

export default function NotificationsPage() {
  const t = useTranslations()
  const { data: result, isLoading, isError, error } = useNotifications()
  const markReadMutation = useMarkRead()
  const markAllReadMutation = useMarkAllRead()
  const deleteNotificationMutation = useDeleteNotification()
  const deleteAllMutation = useDeleteAllNotifications()
  const [filter, setFilter] = useState<FilterState>('all')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <BounceLoader />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  const allNotifications = result?.data ?? []
  const notifications =
    filter === 'all'
      ? allNotifications
      : filter === 'unread'
        ? allNotifications.filter(n => !n.isRead)
        : allNotifications.filter(n => n.isRead)

  const unreadCount = allNotifications.filter(n => !n.isRead).length

  return (
    <div className="max-w-[700px] mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-3xl font-semibold text-foreground">{t('notifications.title')}</h1>
        {allNotifications.length > 0 && (
          <div className="flex items-center gap-1 mt-3">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="gap-1.5 text-xs"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t('notifications.markAllRead')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteAllMutation.mutate()}
              disabled={deleteAllMutation.isPending}
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('notifications.deleteAll')}
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 mb-4">
        {(['all', 'unread', 'read'] as const).map(f => (
          <Button
            key={f}
            variant="ghost"
            size="sm"
            onClick={() => setFilter(f)}
            className={`text-xs h-7 px-2.5 ${
              filter === f ? 'bg-accent text-foreground' : 'text-muted-foreground'
            }`}
          >
            {t(`notifications.${f}` as Parameters<typeof t>[0])}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-1 text-[10px] px-1 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t('notifications.noNotifications')}</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={() => markReadMutation.mutate(notification.id)}
              onDelete={() => deleteNotificationMutation.mutate(notification.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// Notification Item
// ============================================

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: NotificationListItem
  onMarkRead: () => void
  onDelete: () => void
}) {
  const t = useTranslations()
  const timeAgo = getTimeAgo(new Date(notification.createdAt), t)

  const handleClick = () => {
    if (!notification.isRead) onMarkRead()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={
        notification.isRead
          ? notification.message
          : `${t('common.markAsRead')}: ${notification.message}`
      }
      className={`group flex items-start gap-3 px-3 py-3 rounded-md transition-colors cursor-pointer ${
        notification.isRead ? 'hover:bg-muted' : 'bg-accent/50 hover:bg-accent'
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Unread dot */}
      <div className="mt-1.5 shrink-0">
        {!notification.isRead ? (
          <div className="w-2 h-2 rounded-full bg-primary" />
        ) : (
          <div className="w-2 h-2" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            notification.isRead ? 'text-muted-foreground' : 'text-foreground font-medium'
          }`}
        >
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
      </div>

      {/* Delete button */}
      <button
        type="button"
        aria-label={t('common.delete')}
        className="shrink-0 mt-1 p-1 rounded-sm text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:text-destructive transition-opacity"
        onClick={e => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ============================================
// Time Ago Helper
// ============================================

function getTimeAgo(date: Date, t: ReturnType<typeof useTranslations>): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHour = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return t('notifications.justNow' as Parameters<typeof t>[0])
  if (diffMin < 60)
    return t('notifications.timeAgo' as Parameters<typeof t>[0], { time: `${diffMin}m` })
  if (diffHour < 24)
    return t('notifications.timeAgo' as Parameters<typeof t>[0], { time: `${diffHour}h` })
  if (diffDay < 30)
    return t('notifications.timeAgo' as Parameters<typeof t>[0], { time: `${diffDay}d` })
  return date.toLocaleDateString()
}
