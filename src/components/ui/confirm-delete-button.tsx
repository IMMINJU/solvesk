'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Props {
  onDelete: () => void
  isPending?: boolean
  confirmLabel?: string
}

export function ConfirmDeleteButton({ onDelete, isPending = false, confirmLabel }: Props) {
  const t = useTranslations()
  const label = confirmLabel ?? t('common.delete')
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            onDelete()
            if (!isPending) setConfirming(false)
          }}
          disabled={isPending}
          className="px-2 py-1 text-xs text-white bg-destructive hover:bg-destructive/90 rounded transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : label}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded transition-colors"
        >
          {t('common.cancel')}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
      title={label}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
