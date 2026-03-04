'use client'

import { forwardRef, useImperativeHandle, useState } from 'react'
import { Avatar } from '@/components/avatar'

interface MentionableUser {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface MentionListProps {
  items: MentionableUser[]
  command: (item: { id: string; label: string }) => void
}

export const MentionList = forwardRef<
  { onKeyDown: (params: { event: KeyboardEvent }) => boolean },
  MentionListProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const safeSelectedIndex = Math.min(selectedIndex, props.items.length - 1)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command({
        id: item.id,
        label: item.name || item.email.split('@')[0],
      })
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }
      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }
      if (event.key === 'Enter') {
        enterHandler()
        return true
      }
      return false
    },
  }))

  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto min-w-[280px] w-max">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
              index === safeSelectedIndex ? 'bg-accent' : 'hover:bg-muted'
            }`}
            onClick={() => selectItem(index)}
          >
            <Avatar src={item.image} fallback={item.name || item.email} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {item.name || item.email.split('@')[0]}
              </p>
              <p className="text-xs text-muted-foreground truncate">{item.email}</p>
            </div>
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-muted-foreground">No results found</div>
      )}
    </div>
  )
})

MentionList.displayName = 'MentionList'
