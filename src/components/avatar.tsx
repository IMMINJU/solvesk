import Image from 'next/image'

interface AvatarProps {
  src?: string | null | undefined
  alt?: string
  fallback?: string
  name?: string
  image?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  priority?: boolean
  loading?: 'lazy' | 'eager'
}

const sizeMap = {
  xs: { container: 'w-6 h-6', text: 'text-xs', pixels: 24 },
  sm: { container: 'w-8 h-8', text: 'text-sm', pixels: 32 },
  md: { container: 'w-10 h-10', text: 'text-base', pixels: 40 },
  lg: { container: 'w-12 h-12', text: 'text-lg', pixels: 48 },
}

export function Avatar({
  src,
  alt = '',
  fallback,
  name,
  image,
  size = 'sm',
  className = '',
  priority = false,
  loading = 'lazy',
}: AvatarProps) {
  const { container, text, pixels } = sizeMap[size]

  const actualSrc = image !== undefined ? image : src
  const actualFallback = name !== undefined ? name : fallback

  if (actualSrc) {
    return (
      <Image
        src={actualSrc}
        alt={alt}
        width={pixels}
        height={pixels}
        className={`${container} rounded-full object-cover ${className}`}
        priority={priority}
        loading={loading}
      />
    )
  }

  return (
    <div
      className={`${container} rounded-full bg-border flex items-center justify-center ${className}`}
    >
      <span className={`${text} font-medium text-muted-foreground`}>
        {actualFallback ? actualFallback.charAt(0).toUpperCase() : '?'}
      </span>
    </div>
  )
}
