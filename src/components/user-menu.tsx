'use client'

import { signOut } from 'next-auth/react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { LogOut, Settings } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

interface UserMenuProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  position?: 'top' | 'bottom'
}

export function UserMenu({ user, position = 'bottom' }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const t = useTranslations()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      buttonRef.current?.focus()
    }
  }, [])

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  return (
    <div className="relative" ref={menuRef} onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity"
        aria-label={t('nav.userMenu')}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {user.image ? (
          <img src={user.image} alt={user.name || 'User'} className="w-7 h-7 rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-medium">
              {user.name?.[0] || user.email?.[0] || 'U'}
            </span>
          </div>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className={`absolute w-48 bg-popover rounded-lg shadow-lg border border-border py-1 z-50 ${
            position === 'top' ? 'bottom-full left-0 mb-2' : 'top-full right-0 mt-2'
          }`}
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Settings className="h-4 w-4" />
            {t('nav.settings')}
          </Link>

          <button
            role="menuitem"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {t('auth.signOut')}
          </button>
        </div>
      )}
    </div>
  )
}
