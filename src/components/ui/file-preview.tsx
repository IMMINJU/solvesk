'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface FilePreviewProps {
  fileUrl: string
  fileName: string
  mimeType?: string
  onClose: () => void
}

export function FilePreview({ fileUrl, fileName, mimeType, onClose }: FilePreviewProps) {
  const t = useTranslations()
  const fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  const textExtensions = [
    '.txt',
    '.md',
    '.json',
    '.xml',
    '.csv',
    '.log',
    '.yaml',
    '.yml',
    '.ini',
    '.conf',
  ]
  const isTextFile = textExtensions.includes(fileExt)

  const [textContent, setTextContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(isTextFile)

  useEffect(() => {
    if (!isTextFile) return
    let cancelled = false
    fetch(fileUrl)
      .then(res => res.text())
      .then(text => {
        if (!cancelled) {
          setTextContent(text)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTextContent(t('errors.fileLoadFailed'))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [fileUrl, isTextFile])

  const renderPreview = () => {
    if (mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName)) {
      return (
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-full max-h-[80vh] object-contain mx-auto"
        />
      )
    }

    if (mimeType === 'application/pdf' || fileExt === '.pdf') {
      return <iframe src={fileUrl} className="w-full h-[80vh]" title={fileName} />
    }

    if (mimeType?.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi)$/i.test(fileName)) {
      return (
        <video src={fileUrl} controls className="max-w-full max-h-[80vh] mx-auto">
          {t('errors.videoNotSupported')}
        </video>
      )
    }

    if (mimeType?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(fileName)) {
      return (
        <div className="flex items-center justify-center h-[80vh]">
          <audio src={fileUrl} controls className="w-full max-w-md">
            {t('errors.audioNotSupported')}
          </audio>
        </div>
      )
    }

    if (textExtensions.includes(fileExt)) {
      if (loading) {
        return (
          <div className="flex items-center justify-center h-[80vh]">{t('common.loading')}</div>
        )
      }
      return (
        <pre className="bg-muted p-4 rounded overflow-auto max-h-[80vh] text-sm">{textContent}</pre>
      )
    }

    const officeExtensions = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']
    if (officeExtensions.includes(fileExt)) {
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + fileUrl)}&embedded=true`
      return <iframe src={viewerUrl} className="w-full h-[80vh]" title={fileName} />
    }

    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <p className="text-muted-foreground">{t('errors.previewNotAvailable')}</p>
        <a
          href={fileUrl}
          download={fileName}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          {t('attachments.download')}
        </a>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-popover rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-popover border-b border-border">
          <h3 className="font-medium text-lg truncate flex-1">{fileName}</h3>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-accent rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">{renderPreview()}</div>
      </div>
    </div>
  )
}
