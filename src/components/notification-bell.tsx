'use client'

import { Bell } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useUnreadCount } from '@/features/notification/hooks/use-notifications'

export function NotificationBell() {
  const { data } = useUnreadCount()
  const count = data?.count ?? 0

  return (
    <Link
      href="/notifications"
      className="relative p-1.5 rounded-md hover:bg-accent transition-colors"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4 text-muted-foreground" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
