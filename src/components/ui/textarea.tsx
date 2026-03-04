import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none resize-none',
        'placeholder:text-muted-foreground/60',
        'focus:border-foreground/40 focus:ring-1 focus:ring-ring/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
