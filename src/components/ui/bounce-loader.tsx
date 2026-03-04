interface BounceLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

const dotSizes = {
  sm: 'w-1 h-1',
  md: 'w-2 h-2',
  lg: 'w-3 h-3',
}

export function BounceLoader({ size = 'md', text, fullScreen = false }: BounceLoaderProps) {
  const loader = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`relative ${sizeClasses[size]}`}>
        <div className="absolute inset-0 flex items-center justify-center gap-1">
          <div
            className={`${dotSizes[size]} bg-foreground rounded-full animate-bounce`}
            style={{ animationDelay: '0ms', animationDuration: '1s' }}
          />
          <div
            className={`${dotSizes[size]} bg-foreground rounded-full animate-bounce`}
            style={{ animationDelay: '150ms', animationDuration: '1s' }}
          />
          <div
            className={`${dotSizes[size]} bg-foreground rounded-full animate-bounce`}
            style={{ animationDelay: '300ms', animationDuration: '1s' }}
          />
        </div>
      </div>
      {text && <p className="text-sm text-muted-foreground font-normal">{text}</p>}
    </div>
  )

  if (fullScreen) {
    return <div className="flex items-center justify-center min-h-[400px] py-20">{loader}</div>
  }

  return loader
}

export function InlineLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <div
        className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
        style={{ animationDelay: '0ms', animationDuration: '1s' }}
      />
      <div
        className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
        style={{ animationDelay: '150ms', animationDuration: '1s' }}
      />
      <div
        className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
        style={{ animationDelay: '300ms', animationDuration: '1s' }}
      />
    </div>
  )
}
