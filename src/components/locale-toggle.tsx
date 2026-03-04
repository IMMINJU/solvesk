'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { Languages } from 'lucide-react'

export function LocaleToggle() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const nextLocale = locale === 'en' ? 'ko' : 'en'

  function handleToggle() {
    router.replace(pathname, { locale: nextLocale })
  }

  return (
    <button
      onClick={handleToggle}
      className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground text-xs font-medium"
      aria-label={`Switch to ${nextLocale === 'en' ? 'English' : '한국어'}`}
      title={nextLocale === 'en' ? 'English' : '한국어'}
    >
      {locale.toUpperCase()}
    </button>
  )
}
