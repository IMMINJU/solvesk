'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors')

  useEffect(() => {
    console.error('Locale-level error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold text-foreground">{t('pageError')}</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {t('pageErrorDescription')}
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>
          {t('tryAgain')}
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/">{t('goHome')}</Link>
        </Button>
      </div>
    </div>
  )
}
