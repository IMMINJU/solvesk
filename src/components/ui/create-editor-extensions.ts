import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { Link } from '@tiptap/extension-link'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Underline } from '@tiptap/extension-underline'
import { Markdown } from 'tiptap-markdown'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import { MentionList } from './mention-list'
import type { MutableRefObject } from 'react'

export interface MentionableUser {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface CreateExtensionsOptions {
  placeholder: string
  mentionableUsersRef: MutableRefObject<MentionableUser[]>
  lowlight: ReturnType<typeof import('lowlight').createLowlight>
}

function createMentionSuggestion(
  mentionableUsersRef: MutableRefObject<MentionableUser[]>
): Partial<SuggestionOptions> {
  return {
    char: '@',
    items: ({ query }: { query: string }) => {
      return mentionableUsersRef.current
        .filter(user => {
          const search = query.toLowerCase()
          return (
            user.name?.toLowerCase().includes(search) || user.email?.toLowerCase().includes(search)
          )
        })
        .slice(0, 5)
    },
    render: () => {
      let component: ReactRenderer<unknown>
      let popup: TippyInstance[]

      return {
        onStart: (props: SuggestionProps) => {
          if (component) {
            try {
              component.destroy()
            } catch {
              /* already destroyed */
            }
          }

          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          })

          if (!props.clientRect) return

          setTimeout(() => {
            popup = tippy('body', {
              getReferenceClientRect: props.clientRect as () => DOMRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: 'manual',
              placement: 'bottom-start',
              zIndex: 9999,
              duration: [200, 150],
            })
            setTimeout(() => {
              popup[0]?.show()
            }, 50)
          }, 0)
        },

        onUpdate(props: SuggestionProps) {
          component.updateProps(props)
          if (!props.clientRect) return
          popup[0].setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          })
        },

        onKeyDown(props: { event: KeyboardEvent }) {
          if (props.event.key === 'Escape') {
            popup[0].hide()
            return true
          }
          return (
            (component.ref as { onKeyDown?: (props: unknown) => boolean })?.onKeyDown?.(props) ||
            false
          )
        },

        onExit() {
          try {
            popup?.[0]?.destroy()
          } catch {
            /* already destroyed */
          }
          try {
            component?.destroy()
          } catch {
            /* already destroyed */
          }
        },
      }
    },
  }
}

export function createEditorExtensions({
  placeholder,
  mentionableUsersRef,
  lowlight,
}: CreateExtensionsOptions) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      link: false,
      underline: false,
    }),
    CodeBlockLowlight.configure({
      lowlight,
      HTMLAttributes: { class: 'code-block' },
    }),
    Markdown.configure({
      html: true,
      transformPastedText: true,
      transformCopiedText: false,
    }),
    Image.configure({
      inline: true,
      allowBase64: false,
      HTMLAttributes: { class: 'rounded-lg max-w-full h-auto' },
    }),
    Placeholder.configure({ placeholder }),
    Mention.configure({
      HTMLAttributes: { class: 'mention' },
      suggestion: createMentionSuggestion(mentionableUsersRef),
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: 'border-collapse table-auto w-full' },
    }),
    TableRow.configure({
      HTMLAttributes: { class: 'border' },
    }),
    TableHeader.configure({
      HTMLAttributes: { class: 'border border-border bg-muted font-bold p-2 text-left' },
    }),
    TableCell.configure({
      HTMLAttributes: { class: 'border border-border p-2' },
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'text-primary underline hover:text-primary/80' },
    }),
    TaskList.configure({
      HTMLAttributes: { class: 'list-none pl-0' },
    }),
    TaskItem.configure({
      HTMLAttributes: { class: 'flex items-start gap-2' },
    }),
    Underline,
  ]
}
