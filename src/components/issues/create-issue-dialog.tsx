'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCreateIssue } from '@/features/issue/hooks/use-issue-mutations'
import { useProjects } from '@/features/project/hooks/use-projects'
import { FileUploader } from '@/components/file-uploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TiptapEditor } from '@/components/ui/tiptap-editor'
import { InlineSelect } from '@/components/ui/inline-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { TYPE_OPTIONS, PRIORITY_OPTIONS } from '@/config/issue'

interface CreateIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fixed project ID — hides project selector when provided */
  projectId?: number
}

export function CreateIssueDialog({
  open,
  onOpenChange,
  projectId: fixedProjectId,
}: CreateIssueDialogProps) {
  const t = useTranslations()
  const createMutation = useCreateIssue()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState('bug')
  const [priority, setPriority] = useState('medium')
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(fixedProjectId)
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      fileName: string
      fileUrl: string
      fileSize?: number
      mimeType?: string
    }>
  >([])
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Only fetch projects when no fixed projectId
  const { data: projects } = useProjects()
  const projectList = !fixedProjectId ? (projects ?? []) : []

  const effectiveProjectId = fixedProjectId ?? selectedProjectId

  const typeOptions = TYPE_OPTIONS.map(o => ({
    ...o,
    label: t(`issueType.${o.value}` as Parameters<typeof t>[0]),
  }))
  const priorityOptions = PRIORITY_OPTIONS.map(o => ({
    ...o,
    label: t(`priority.${o.value}` as Parameters<typeof t>[0]),
  }))

  // Validation
  const titleError = touched.title && !title.trim() ? t('validation.titleRequired') : ''
  const projectError =
    touched.project && !fixedProjectId && !selectedProjectId ? t('validation.projectRequired') : ''
  const isFormValid = !!title.trim() && !!effectiveProjectId

  function resetForm() {
    setTitle('')
    setContent('')
    setType('bug')
    setPriority('medium')
    setUploadedFiles([])
    setTouched({})
    if (!fixedProjectId) setSelectedProjectId(undefined)
  }

  function handleSubmit() {
    setTouched({ title: true, project: true })
    if (!title.trim() || !effectiveProjectId) return
    createMutation.mutate(
      {
        projectId: effectiveProjectId,
        title,
        content: content || undefined,
        type: type as 'bug' | 'feature' | 'inquiry',
        priority: priority as 'urgent' | 'high' | 'medium' | 'low',
      },
      {
        onSuccess: async (data: unknown) => {
          const issueData = data as { issueKey?: string } | undefined
          if (uploadedFiles.length > 0 && issueData?.issueKey) {
            try {
              await fetch(`/api/issues/${issueData.issueKey}/attachments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attachments: uploadedFiles }),
              })
            } catch {
              // Attachment failure shouldn't block issue creation
            }
          }
          toast.success(t('issues.createIssue'))
          onOpenChange(false)
          resetForm()
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('issues.createIssue')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* Title */}
          <div>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, title: true }))}
              placeholder={t('issues.issueTitle')}
              maxLength={500}
              autoFocus
              aria-invalid={!!titleError}
              className="text-lg font-medium border-none px-0 h-auto py-1 focus:ring-0 placeholder:text-muted-foreground/40"
            />
            {titleError && <p className="text-xs text-destructive mt-1">{titleError}</p>}
          </div>

          {/* Properties row */}
          <div className="flex items-center gap-4 py-2 border-y border-border flex-wrap">
            {/* Project selector (only when no fixed projectId) */}
            {!fixedProjectId && projectList.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Label className="shrink-0">{t('issues.project')}</Label>
                  <Select
                    value={selectedProjectId ? String(selectedProjectId) : ''}
                    onValueChange={v => {
                      setSelectedProjectId(v ? Number(v) : undefined)
                      setTouched(prev => ({ ...prev, project: true }))
                    }}
                  >
                    <SelectTrigger size="sm" className="h-7 text-xs min-w-[140px]">
                      <SelectValue placeholder={`${t('issues.project')}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {projectList.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {projectError && <p className="text-xs text-destructive">{projectError}</p>}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Label className="shrink-0">{t('issues.type')}</Label>
              <InlineSelect value={type} options={typeOptions} onChange={setType} portal={false} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="shrink-0">{t('issues.priority')}</Label>
              <InlineSelect
                value={priority}
                options={priorityOptions}
                onChange={setPriority}
                portal={false}
              />
            </div>
          </div>

          {/* Rich text editor */}
          <div className="min-h-[300px]">
            <TiptapEditor
              content={content}
              onChange={setContent}
              placeholder={t('issues.description')}
            />
          </div>

          {/* Attachments */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t('issues.attachments')}
                {uploadedFiles.length > 0 && ` (${uploadedFiles.length})`}
              </span>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="space-y-1 mb-2">
                {uploadedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate flex-1">{file.fileName}</span>
                    <button
                      type="button"
                      onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <FileUploader
              compact
              onUploadComplete={files => setUploadedFiles(prev => [...prev, ...files])}
              onUploadError={error => toast.error(error.message)}
            />
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            disabled={createMutation.isPending || !isFormValid}
            onClick={handleSubmit}
          >
            {createMutation.isPending ? t('validation.creating') : t('issues.createIssue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
