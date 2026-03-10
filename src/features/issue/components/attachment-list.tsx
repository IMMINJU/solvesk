'use client'

import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import {
  useIssueAttachments,
  useAddAttachments,
  useDeleteAttachment,
} from '../hooks/use-attachment-mutations'
import { FileUploader } from '@/components/file-uploader'
import { toast } from 'sonner'
import { FileIcon, Trash2, Download } from 'lucide-react'
import { isAdmin as checkAdmin } from '@/lib/permissions-config'

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

interface AttachmentListProps {
  issueKey: string
}

export function AttachmentList({ issueKey }: AttachmentListProps) {
  const t = useTranslations()
  const { data: session } = useSession()
  const { data: attachments = [], isLoading } = useIssueAttachments(issueKey)
  const addMutation = useAddAttachments(issueKey)
  const deleteMutation = useDeleteAttachment(issueKey)

  const userId = session?.user?.id
  const userRole = session?.user?.role
  const isAdmin = checkAdmin(userRole)

  const handleUploadComplete = (
    files: Array<{
      fileName: string
      fileUrl: string
      fileSize?: number
      mimeType?: string
    }>
  ) => {
    addMutation.mutate(files, {
      onSuccess: () => {
        toast.success(t('attachments.uploaded'))
      },
    })
  }

  const handleDelete = (attachmentId: number) => {
    deleteMutation.mutate(attachmentId, {
      onSuccess: () => {
        toast.success(t('attachments.deleted'))
      },
    })
  }

  const canDelete = (uploadedBy: string) => isAdmin || uploadedBy === userId

  return (
    <div>
      <h3 className="text-sm font-medium text-foreground mb-3">
        {t('attachments.title')} ({attachments.length})
      </h3>

      {/* File list */}
      {attachments.length > 0 && (
        <div className="space-y-1 mb-3">
          {attachments.map(att => {
            const isImage = att.mimeType?.startsWith('image/')
            return (
              <div
                key={att.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted group transition-colors"
              >
                <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a
                  href={att.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-foreground hover:underline truncate flex-1"
                >
                  {att.fileName}
                </a>
                {att.fileSize && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatFileSize(att.fileSize)}
                  </span>
                )}
                <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                  <a
                    href={att.fileUrl}
                    download={att.fileName}
                    className="p-1 rounded hover:bg-accent transition-colors"
                  >
                    <Download className="h-3 w-3 text-muted-foreground" />
                  </a>
                  {canDelete(att.uploadedBy) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(att.id)}
                      disabled={deleteMutation.isPending}
                      className="p-1 rounded hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload button */}
      <FileUploader
        compact
        onUploadComplete={handleUploadComplete}
        onUploadError={error => toast.error(error.message)}
      />
    </div>
  )
}
