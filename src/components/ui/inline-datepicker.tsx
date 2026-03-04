'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { createPortal } from 'react-dom'
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns'

interface InlineDatePickerProps {
  selected: Date | null
  onChange: (date: Date | null) => void
  className?: string
}

function MiniCalendar({
  selected,
  onSelect,
}: {
  selected: Date | null
  onSelect: (date: Date) => void
}) {
  const [currentMonth, setCurrentMonth] = useState(selected ?? new Date())

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  return (
    <div className="w-[252px]">
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0">
        {weekDays.map(day => (
          <div
            key={day}
            className="h-8 flex items-center justify-center text-xs text-muted-foreground font-medium"
          >
            {day}
          </div>
        ))}
        {days.map(day => {
          const isSelected = selected && isSameDay(day, selected)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isCurrentDay = isToday(day)

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(day)}
              className={`h-8 w-8 flex items-center justify-center text-[13px] rounded-md mx-auto transition-colors
                ${!isCurrentMonth ? 'text-muted-foreground/50' : ''}
                ${isSelected ? 'bg-primary text-primary-foreground font-medium' : ''}
                ${!isSelected && isCurrentDay ? 'font-semibold text-primary' : ''}
                ${!isSelected && isCurrentMonth ? 'hover:bg-accent' : ''}
                ${!isSelected && !isCurrentMonth ? 'hover:bg-accent' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function InlineDatePicker({ selected, onChange, className = '' }: InlineDatePickerProps) {
  const t = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const handleDateChange = (date: Date) => {
    onChange(date)
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  const dropdown =
    isOpen && typeof window !== 'undefined'
      ? createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-popover border border-border rounded-lg shadow-lg p-3"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            <MiniCalendar selected={selected} onSelect={handleDateChange} />
          </div>,
          document.body
        )
      : null

  return (
    <>
      <div ref={containerRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-accent transition-colors group"
        >
          {selected ? (
            <>
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-foreground">{format(selected, 'yyyy-MM-dd')}</span>
              <span
                onClick={handleClear}
                className="ml-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:text-destructive cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            </>
          ) : (
            <>
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{t('common.noDate')}</span>
            </>
          )}
        </button>
      </div>
      {dropdown}
    </>
  )
}
