import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/permissions'
import { isStaff } from '@/lib/permissions-config'
import { getTranslations } from 'next-intl/server'
import { FolderKanban, LayoutDashboard, Users, FileText, Settings, Bell } from 'lucide-react'
import { APP_CONFIG } from '@/config/app'
import { NavLink } from '@/components/nav-link'
import { NotificationBell } from '@/components/notification-bell'
import { MobileNav } from '@/components/mobile-nav'
import { UserMenu } from '@/components/user-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { LocaleToggle } from '@/components/locale-toggle'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${locale}/auth/signin`)
  }

  const t = await getTranslations()
  const canViewDashboard = hasPermission(user.role, 'dashboard', 'view')
  const canViewUsers = hasPermission(user.role, 'users', 'view')
  const navLinkClass =
    'flex items-center gap-2 px-2 py-1.5 text-sidebar-foreground rounded-md hover:bg-sidebar-accent transition-colors'

  return (
    <div className="flex h-[100dvh] bg-background">
      {/* Mobile Navigation */}
      <MobileNav
        user={{
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          project: user.project ? { code: user.project.code, name: user.project.name } : null,
        }}
      />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-sidebar flex-col border-r border-sidebar-border">
        {/* Workspace Header */}
        <div className="p-3">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-semibold">S</span>
            </div>
            <span className="font-medium text-foreground text-sm flex-1">{APP_CONFIG.name}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-0.5">
          {isStaff(user.role) ? (
            <>
              {canViewDashboard && (
                <NavLink href="/dashboard" className={navLinkClass}>
                  <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('nav.dashboard')}</span>
                </NavLink>
              )}
              <NavLink href="/issues" className={navLinkClass}>
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('nav.issues')}</span>
              </NavLink>
              <NavLink href="/projects" className={navLinkClass}>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('nav.projects')}</span>
              </NavLink>
              <NavLink href="/notifications" className={navLinkClass}>
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('nav.notifications')}</span>
              </NavLink>
              {canViewUsers && (
                <NavLink href="/users" className={navLinkClass}>
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('nav.users')}</span>
                </NavLink>
              )}
              <NavLink href="/settings" className={navLinkClass}>
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('nav.settings')}</span>
              </NavLink>
            </>
          ) : (
            <>
              {user.project?.code && (
                <NavLink href={`/projects/${user.project.code}`} className={navLinkClass}>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('nav.issues')}</span>
                </NavLink>
              )}
              <NavLink href="/notifications" className={navLinkClass}>
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('nav.notifications')}</span>
              </NavLink>
              <NavLink href="/settings" className={navLinkClass}>
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('nav.settings')}</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="p-2 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
            <UserMenu
              user={{
                name: user.name,
                email: user.email,
                image: user.image,
              }}
              position="top"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{user.name || t('common.user')}</p>
              <p className="text-xs text-muted-foreground truncate">{t(`roles.${user.role}`)}</p>
            </div>
            <LocaleToggle />
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-background pt-14 md:pt-0">{children}</main>
    </div>
  )
}
