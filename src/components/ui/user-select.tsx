'use client'

import { useState } from 'react'
import { User, ChevronDown, Check } from 'lucide-react'
import { Avatar } from '@/components/avatar'

interface SelectableUser {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface Props {
  value: string | null
  onChange: (userId: string | null) => void
  users: SelectableUser[]
  placeholder?: string
  disabled?: boolean
}

export function UserSelect({
  value,
  onChange,
  users,
  placeholder = 'Unassigned',
  disabled,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedUser = value ? users.find(u => u.id === value) : null

  const handleSelect = (userId: string | null) => {
    onChange(userId)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 w-full px-3 py-2 border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Avatar
          name={selectedUser?.name || selectedUser?.email || '?'}
          image={selectedUser?.image}
          size="xs"
        />
        <span className="text-sm flex-1 text-left text-foreground">
          {selectedUser?.name || selectedUser?.email || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-full bg-popover border border-border rounded-lg shadow-lg py-1 max-h-64 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left"
            >
              <div className="h-6 w-6 rounded-full bg-surface flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">{placeholder}</span>
              {!selectedUser && <Check className="h-4 w-4 ml-auto text-primary" />}
            </button>

            <div className="border-t border-border my-1" />

            {users.map(user => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user.id)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left"
              >
                <Avatar name={user.name || user.email} image={user.image} size="xs" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate">{user.name || user.email}</div>
                  {user.name && (
                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                  )}
                </div>
                {selectedUser?.id === user.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
