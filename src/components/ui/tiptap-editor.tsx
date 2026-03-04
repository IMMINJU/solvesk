'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import { useEffect, useRef, useMemo, useState } from 'react'
import { common, createLowlight } from 'lowlight'
import { useTranslations } from 'next-intl'
import { EditorToolbar } from './editor-toolbar'
import { ImageLightbox } from './image-lightbox'
import { createEditorExtensions, type MentionableUser } from './create-editor-extensions'
import { EDITOR_IMAGE_MAX_SIZE } from '@/config/limits'
import { toast } from 'sonner'

export type { MentionableUser }

interface TiptapEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
  mentionableUsers?: MentionableUser[]
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = 'Write something...',
  editable = true,
  className = '',
  mentionableUsers = [],
}: TiptapEditorProps) {
  const t = useTranslations()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mentionableUsersRef = useRef<MentionableUser[]>(mentionableUsers)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<{ url: string; name: string }[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  if (mentionableUsers && mentionableUsers.length > 0) {
    mentionableUsersRef.current = mentionableUsers
  }

  const lowlight = useMemo(() => createLowlight(common), [])

  const extensions = useMemo(
    () => createEditorExtensions({ placeholder, mentionableUsersRef, lowlight }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placeholder, mentionableUsers.length]
  )

  const handleImageUpload = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!response.ok) {
        const errorData = await response.json()
        toast.error(errorData.message || errorData.error || 'Upload failed')
        throw new Error('Upload failed')
      }
      const data = await response.json()
      return data.url
    } catch {
      return null
    }
  }

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions,
      editable,
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
      editorProps: {
        attributes: {
          class: editable
            ? `max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-sm text-foreground ${className}`
            : `max-w-none focus:outline-none text-sm text-foreground ${className}`,
        },
        handleDrop: (view, event, _slice, moved) => {
          if (!moved && event.dataTransfer?.files?.[0]) {
            const file = event.dataTransfer.files[0]
            if (file.type.startsWith('image/')) {
              event.preventDefault()
              if (file.size > EDITOR_IMAGE_MAX_SIZE) {
                toast.error(t('errors.imageTooLarge'))
                return true
              }
              handleImageUpload(file).then(url => {
                if (url) {
                  const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
                  if (coordinates) {
                    const node = view.state.schema.nodes.image.create({ src: url })
                    view.dispatch(view.state.tr.insert(coordinates.pos, node))
                  }
                }
              })
              return true
            }
          }
          return false
        },
        handlePaste: (_view, event) => {
          const items = event.clipboardData?.items
          if (!items) return false
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
              event.preventDefault()
              const file = items[i].getAsFile()
              if (!file) continue
              if (file.size > EDITOR_IMAGE_MAX_SIZE) {
                toast.error(t('errors.imageTooLarge'))
                return true
              }
              handleImageUpload(file).then(url => {
                if (url && editor) {
                  editor.chain().focus().setImage({ src: url }).run()
                }
              })
              return true
            }
          }
          return false
        },
      },
    },
    [extensions, editable, className]
  )

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    if (!file.type.startsWith('image/')) {
      toast.error(t('errors.imageOnly'))
      return
    }
    if (file.size > EDITOR_IMAGE_MAX_SIZE) {
      toast.error(t('errors.imageTooLarge'))
      return
    }
    const url = await handleImageUpload(file)
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    } else {
      toast.error(t('errors.uploadFailed'))
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    if (editor) {
      try {
        if (content !== editor.getHTML()) {
          editor.commands.setContent(content)
        }
      } catch {
        // Editor view not mounted yet
      }
    }
  }, [content, editor])

  useEffect(() => {
    if (editor) editor.setEditable(editable)
  }, [editor, editable])

  useEffect(() => {
    if (editor) {
      editor.extensionManager.extensions.forEach(ext => {
        if (ext.name === 'placeholder') ext.options.placeholder = placeholder
      })
    }
  }, [editor, placeholder])

  // Read mode: image click → lightbox
  useEffect(() => {
    if (!editable && editor) {
      let el: HTMLElement
      try {
        el = editor.view.dom
      } catch {
        return
      }
      const handleImageClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (target.tagName === 'IMG') {
          e.preventDefault()
          e.stopPropagation()
          const imgSrc = (target as HTMLImageElement).src
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = editor.getHTML()
          const images = Array.from(tempDiv.querySelectorAll('img')).map((img, index) => ({
            url: (img as HTMLImageElement).src,
            name: `Image ${index + 1}`,
          }))
          const clickedIndex = images.findIndex(img => img.url === imgSrc)
          setLightboxImages(images)
          setLightboxIndex(clickedIndex !== -1 ? clickedIndex : 0)
          setLightboxOpen(true)
        }
      }
      el.addEventListener('click', handleImageClick)
      return () => el.removeEventListener('click', handleImageClick)
    }
  }, [editable, editor])

  if (!editor) return null

  if (!editable) {
    return (
      <>
        <div className="tiptap-readonly text-sm text-foreground">
          <EditorContent editor={editor} />
        </div>
        {lightboxOpen && lightboxImages.length > 0 && (
          <ImageLightbox
            images={lightboxImages}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
            onNavigate={setLightboxIndex}
          />
        )}
      </>
    )
  }

  return (
    <div
      className={`tiptap-editable border border-border rounded-lg overflow-hidden bg-background hover:border-muted-foreground transition-colors flex flex-col ${className}`}
    >
      <EditorToolbar
        editor={editor}
        fileInputRef={fileInputRef}
        onImageSelect={handleImageSelect}
      />
      <div className="flex-1 overflow-y-auto min-h-0">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  )
}
