'use client'

import { memo } from 'react'

interface ConfigSelectProps<T extends string> {
  value: T | ''
  onChange: (value: T | '') => void
  config: Record<T, { label: string }>
  placeholder?: string
  label?: string
  className?: string
  disabled?: boolean
}

function ConfigSelectInner<T extends string>({
  value,
  onChange,
  config,
  placeholder = 'All',
  label,
  className = '',
  disabled = false,
}: ConfigSelectProps<T>) {
  return (
    <div>
      {label && <label className="block text-xs text-muted-foreground mb-1">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value as T | '')}
        disabled={disabled}
        className={`px-2 py-1.5 text-sm border border-border rounded-md bg-background min-w-[100px] focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${className}`}
        aria-label={label}
      >
        <option value="">{placeholder}</option>
        {Object.entries(config).map(([key, value]) => (
          <option key={key} value={key}>
            {(value as { label: string }).label}
          </option>
        ))}
      </select>
    </div>
  )
}

export const ConfigSelect = memo(ConfigSelectInner) as typeof ConfigSelectInner
