'use client'

import { useState } from 'react'
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  FileText,
  FolderKanban,
  Bell,
  Settings,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { NotificationBell } from './notification-bell'
import { UserMenu } from './user-menu'
import { ThemeToggle } from './theme-toggle'
import { LocaleToggle } from './locale-toggle'
import { APP_CONFIG } from '@/config/app'
import { isStaff, isAdmin } from '@/lib/permissions-config'

interface Props {
  user: {
    name: string | null
    email: string
    image: string | null
    role: string
    project?: { code: string; name: string } | null
  }
}

export function MobileNav({ user }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const t = useTranslations()
  const staff = isStaff(user.role)
  const admin = isAdmin(user.role)

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b border-border z-40 px-4 flex items-center justify-between">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 -ml-2 rounded-md hover:bg-accent transition-colors"
          aria-label={t('nav.openMenu')}
          aria-expanded={isOpen}
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-semibold">S</span>
          </div>
          <span className="font-medium text-foreground">{APP_CONFIG.name}</span>
        </div>

        <div className="flex items-center gap-1">
          <LocaleToggle />
          <ThemeToggle />
          <NotificationBell />
          <UserMenu user={user} />
        </div>
      </header>

      {isOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-50"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="md:hidden fixed inset-y-0 left-0 w-64 bg-sidebar z-50 flex flex-col shadow-xl"
            role="dialog"
            aria-label={t('nav.openMenu')}
          >
            <div className="p-3 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-semibold">S</span>
                </div>
                <span className="font-medium text-foreground">{APP_CONFIG.name}</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md hover:bg-accent transition-colors"
                aria-label={t('nav.closeMenu')}
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <nav className="flex-1 p-2 space-y-0.5">
              {staff ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-foreground rounded-md hover:bg-accent transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('nav.dashboard')}</span>
                  </Link>
                  <Link
                    href="/issues"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-foreground rounded-md hover:bg-accent transition-colors"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('nav.issues')}</span>
                  </Link>
                  <Link
                    href="/projects"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-foreground rounded-md hover:bg-accent transition-colors"
                  >
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('nav.projects')}</span>
                  </Link>
                  <Link
                    href="/notifications"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-foreground rounded-md hover:bg-accent transition-colors"
                  >
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('nav.notifications')}</span>
                  </Link>
                  {admin && (
                    <Link
                      href="/users"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-foreground rounded-md hover:bg-accent transition-colors"
                    >
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{t('nav.users')}</span>
                    </Link>
                  )}
                  <Link
                    href="/settings"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-foreground rounded-md hover:bg-accent transition-colors"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('nav.settings')}</span>
                  </Link>
                </>
              ) : (
                <>
                  {user.project?.code && (
                    <Link
                      href={`/projects/${user.project.code}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-foreground rounded-md hover:bg-accent transition-colors"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{t('nav.issues')}</span>
                    </Link>
                  )}
                  <Link
                    href="/notifications"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-foreground rounded-md hover:bg-accent transition-colors"
                  >
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('nav.notifications')}</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-foreground rounded-md hover:bg-accent transition-colors"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('nav.settings')}</span>
                  </Link>
                </>
              )}
            </nav>

            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-2">
                <UserMenu user={user} position="top" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {user.name || t('common.user')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`roles.${user.role}` as Parameters<typeof t>[0])}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
