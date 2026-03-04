'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, X, FileIcon, Loader2, AlertCircle } from 'lucide-react'
import { FILE_LIMITS } from '@/config/limits'

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

interface UploadedFile {
  fileName: string
  fileUrl: string
  fileSize?: number
  mimeType?: string
}

interface FileUploaderProps {
  onUploadComplete: (files: UploadedFile[]) => void
  onUploadError?: (error: Error) => void
  maxFiles?: number
  compact?: boolean
}

export function FileUploader({
  onUploadComplete,
  onUploadError,
  compact = false,
}: FileUploaderProps) {
  const t = useTranslations()
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    async (selectedFiles: File[]) => {
      if (selectedFiles.length === 0) return

      setError(null)

      const validFiles: File[] = []
      const invalidFiles: string[] = []

      for (const file of selectedFiles) {
        if (file.size > FILE_LIMITS.maxFileSize) {
          invalidFiles.push(
            t('errors.fileTooLarge', {
              name: file.name,
              maxSize: formatFileSize(FILE_LIMITS.maxFileSize),
            })
          )
          continue
        }
        if (/[<>:"|?*]/.test(file.name)) {
          invalidFiles.push(t('errors.invalidFileName', { name: file.name }))
          continue
        }
        if (file.size === 0) {
          invalidFiles.push(t('errors.emptyFile', { name: file.name }))
          continue
        }
        validFiles.push(file)
      }

      if (invalidFiles.length > 0) {
        const summary = invalidFiles.slice(0, 3).join(', ')
        const more =
          invalidFiles.length > 3
            ? ` ${t('errors.andMore' as Parameters<typeof t>[0], { count: invalidFiles.length - 3 })}`
            : ''
        setError(`${t('errors.cannotUpload' as Parameters<typeof t>[0])}: ${summary}${more}`)
        if (validFiles.length === 0) return
      }

      const newPreviews: Record<string, string> = {}
      validFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
          newPreviews[file.name] = URL.createObjectURL(file)
        }
      })

      setFiles(validFiles)
      setPreviews(newPreviews)
      setUploading(true)

      try {
        const uploadPromises = validFiles.map(async file => {
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const validationErrors = Object.entries(errorData)
              .filter(([key, value]) => key !== 'error' && typeof value === 'string')
              .map(([, value]) => value)

            const errorMessage =
              validationErrors.length > 0
                ? validationErrors.join(', ')
                : errorData.message || errorData.error || `Upload failed: ${response.statusText}`
            throw new Error(errorMessage)
          }

          const data = await response.json()
          return {
            fileName: data.name,
            fileUrl: data.url,
            fileSize: data.size,
            mimeType: data.type,
          }
        })

        const uploadedFiles = await Promise.all(uploadPromises)
        onUploadComplete(uploadedFiles)
        setFiles([])
        setPreviews({})
        setUploading(false)
      } catch (error) {
        onUploadError?.(error as Error)
        setFiles([])
        setPreviews({})
        setUploading(false)
      }
    },
    [onUploadComplete, onUploadError, t]
  )

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    await processFiles(selectedFiles)
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (uploading) return

      const droppedFiles = Array.from(e.dataTransfer.files)
      await processFiles(droppedFiles)
    },
    [uploading, processFiles]
  )

  const handleRemove = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.name !== fileName))
    if (previews[fileName]) {
      URL.revokeObjectURL(previews[fileName])
      setPreviews(prev => {
        const { [fileName]: _removed, ...rest } = prev
        return rest
      })
    }
  }

  if (compact) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('common.uploading')}
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              {t('attachments.attach')}
            </>
          )}
        </button>
      </>
    )
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-primary font-medium">{t('common.uploading')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload
              className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}
            />
            <div>
              <p className="text-sm font-medium text-foreground">{t('attachments.dropZone')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('attachments.maxFileSize' as Parameters<typeof t>[0], {
                  size: formatFileSize(FILE_LIMITS.maxFileSize),
                })}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium mb-1">{t('errors.uploadError')}</p>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <div key={file.name} className="flex items-center gap-3 bg-muted rounded-lg p-3">
              <div className="flex-shrink-0">
                {previews[file.name] ? (
                  <div className="w-12 h-12 rounded overflow-hidden bg-background">
                    <img
                      src={previews[file.name]}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded bg-background flex items-center justify-center">
                    <FileIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>

              {!uploading && (
                <button
                  type="button"
                  onClick={() => handleRemove(file.name)}
                  className="flex-shrink-0 p-1 hover:bg-background rounded transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}

              {uploading && <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
