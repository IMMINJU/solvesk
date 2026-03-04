'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Option {
  value: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

interface InlineSelectProps {
  value: string
  options: Option[]
  onChange: (value: string) => void
  formatLabel?: (option: Option) => React.ReactNode
  formatDisplay?: (option: Option) => React.ReactNode
  className?: string
  /** Set to false when used inside a Radix Dialog (avoids inert conflict) */
  portal?: boolean
}

export function InlineSelect({
  value,
  options,
  onChange,
  formatLabel,
  formatDisplay,
  className = '',
  portal = true,
}: InlineSelectProps) {
  const t = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      })
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault()
          setIsOpen(true)
        }
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        return
      }

      const currentIndex = options.findIndex(o => o.value === value)

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIndex = (currentIndex + 1) % options.length
        onChange(options[nextIndex].value)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIndex = (currentIndex - 1 + options.length) % options.length
        onChange(options[prevIndex].value)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsOpen(false)
      }
    },
    [isOpen, options, value, onChange]
  )

  const dropdownContent = isOpen ? (
    <div
      ref={dropdownRef}
      role="listbox"
      aria-activedescendant={value ? `inline-select-option-${value}` : undefined}
      className={
        portal
          ? 'fixed z-[9999] min-w-[150px] bg-popover border border-border rounded-md shadow-lg py-1'
          : 'absolute top-full left-0 mt-1 z-50 min-w-[150px] bg-popover border border-border rounded-md shadow-lg py-1'
      }
      style={
        portal
          ? { top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px` }
          : undefined
      }
    >
      {options.map(option => {
        const Icon = option.icon
        return (
          <button
            key={option.value}
            id={`inline-select-option-${option.value}`}
            type="button"
            role="option"
            aria-selected={option.value === value}
            onClick={e => {
              e.stopPropagation()
              handleSelect(option.value)
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors ${
              option.value === value ? 'bg-accent' : ''
            }`}
          >
            {formatLabel ? (
              formatLabel(option)
            ) : (
              <>
                {Icon && <Icon className="h-4 w-4" />}
                <span>{option.label}</span>
              </>
            )}
          </button>
        )
      })}
    </div>
  ) : null

  return (
    <>
      <div ref={containerRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          onKeyDown={handleKeyDown}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-accent transition-colors group"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          {formatDisplay && selectedOption ? (
            formatDisplay(selectedOption)
          ) : formatLabel && selectedOption ? (
            formatLabel(selectedOption)
          ) : (
            <span>{selectedOption?.label || t('common.select')}</span>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
        </button>
        {!portal && dropdownContent}
      </div>
      {portal && typeof window !== 'undefined' && dropdownContent
        ? createPortal(dropdownContent, document.body)
        : null}
    </>
  )
}
