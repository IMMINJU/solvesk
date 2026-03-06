'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors')

  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="text-lg font-medium text-foreground">{t('pageError')}</p>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {t('pageErrorDescription')}
      </p>
      <Button variant="outline" onClick={reset}>
        {t('tryAgain')}
      </Button>
    </div>
  )
}
