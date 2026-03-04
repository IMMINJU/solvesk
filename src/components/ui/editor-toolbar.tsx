'use client'

import { type Editor } from '@tiptap/react'
import type { RefObject, ChangeEvent } from 'react'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Quote,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  TableIcon,
  Trash2,
  Strikethrough,
  Minus,
} from 'lucide-react'

interface EditorToolbarProps {
  editor: Editor
  fileInputRef: RefObject<HTMLInputElement | null>
  onImageSelect: (e: ChangeEvent<HTMLInputElement>) => void
}

export function EditorToolbar({ editor, fileInputRef, onImageSelect }: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-2 border-b border-border bg-muted flex-wrap shrink-0">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded hover:bg-background transition-colors ${
          editor.isActive('bold') ? 'bg-background text-foreground' : 'text-muted-foreground'
        }`}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded hover:bg-background transition-colors ${
          editor.isActive('italic') ? 'bg-background text-foreground' : 'text-muted-foreground'
        }`}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`p-1.5 rounded hover:bg-background transition-colors ${
          editor.isActive('code') ? 'bg-background text-foreground' : 'text-muted-foreground'
        }`}
        title="Inline Code (Ctrl+E)"
      >
        <Code className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`hidden sm:inline-flex p-1.5 rounded hover:bg-background transition-colors ${
          editor.isActive('strike') ? 'bg-background text-foreground' : 'text-muted-foreground'
        }`}
        title="Strikethrough (Ctrl+Shift+X)"
      >
        <Strikethrough className="h-4 w-4" />
      </button>

      <div className="hidden sm:block w-px h-5 bg-border mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`hidden sm:inline-flex p-1.5 rounded hover:bg-background transition-colors ${
          editor.isActive('heading', { level: 1 })
            ? 'bg-background text-foreground'
            : 'text-muted-foreground'
        }`}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`hidden sm:inline-flex p-1.5 rounded hover:bg-background transition-colors ${
          editor.isActive('heading', { level: 2 })
            ? 'bg-background text-foreground'
            : 'text-muted-foreground'
        }`}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`hidden sm:inline-flex p-1.5 rounded hover:bg-background transition-colors ${
          editor.isActive('heading', { level: 3 })
            ? 'bg-background text-foreground'
            : 'text-muted-foreground'
        }`}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </button>

      <div className="hidden sm:block w-px h-5 bg-border mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded hover:bg-background transition-colors ${
          editor.isActive('bulletList') ? 'bg-background text-foreground' : 'text-muted-foreground'
        }`}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded hover:bg-background transition-colors ${
          editor.isActive('orderedList') ? 'bg-background text-foreground' : 'text-muted-foreground'
        }`}
        title="Ordered List"
      >
        <ListOrdered className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`hidden sm:inline-flex p-1.5 rounded hover:bg-background transition-colors ${
          editor.isActive('blockquote') ? 'bg-background text-foreground' : 'text-muted-foreground'
        }`}
        title="Blockquote"
      >
        <Quote className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="hidden sm:inline-flex p-1.5 rounded hover:bg-background transition-colors text-muted-foreground"
        title="Horizontal Rule"
      >
        <Minus className="h-4 w-4" />
      </button>

      <div className="hidden sm:block w-px h-5 bg-border mx-1" />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="p-1.5 rounded hover:bg-primary/10 transition-colors text-primary"
        title="Insert Image"
      >
        <ImageIcon className="h-4 w-4" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onImageSelect}
        className="hidden"
      />

      <button
        type="button"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        className="hidden sm:inline-flex p-1.5 rounded hover:bg-primary/10 transition-colors text-primary"
        title="Insert Table (3x3)"
      >
        <TableIcon className="h-4 w-4" />
      </button>

      {editor.isActive('table') && (
        <>
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowBefore().run()}
            className="p-1.5 rounded hover:bg-success/10 transition-colors text-success text-xs"
            title="Add row above"
          >
            ↑+
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="p-1.5 rounded hover:bg-success/10 transition-colors text-success text-xs"
            title="Add row below"
          >
            ↓+
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            className="p-1.5 rounded hover:bg-success/10 transition-colors text-success text-xs"
            title="Add column left"
          >
            ←+
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="p-1.5 rounded hover:bg-success/10 transition-colors text-success text-xs"
            title="Add column right"
          >
            →+
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-destructive text-xs"
            title="Delete row"
          >
            ↕-
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-destructive text-xs"
            title="Delete column"
          >
            ↔-
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-destructive"
            title="Delete table"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}

      <div className="w-px h-5 bg-border mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="p-1.5 rounded hover:bg-background transition-colors text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="p-1.5 rounded hover:bg-background transition-colors text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </button>
    </div>
  )
}
