'use client'

import { use, useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { useRouter } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { useIssue } from '@/features/issue/hooks/use-issue'
import {
  useUpdateIssue,
  useUpdateIssueStatus,
  useUpdateIssuePriority,
  useUpdateIssueAssignee,
  useDeleteIssue,
} from '@/features/issue/hooks/use-issue-mutations'
import {
  useIssueComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from '@/features/issue/hooks/use-comment-mutations'
import { useProjectUsers } from '@/features/project/hooks/use-project-users'
import {
  useLabels,
  useAddLabelToIssue,
  useRemoveLabelFromIssue,
} from '@/features/label/hooks/use-labels'
import { BounceLoader } from '@/components/ui/bounce-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'
import { TiptapEditor } from '@/components/ui/tiptap-editor'
import { InlineDatePicker } from '@/components/ui/inline-datepicker'
import { AttachmentList } from '@/features/issue/components/attachment-list'
import { toast } from 'sonner'
import { STATUSES, PRIORITIES } from '@/config/issue'
import { isStaff as checkStaff, isAdmin as checkAdmin } from '@/lib/permissions-config'
import {
  ChevronLeft,
  Circle,
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
  AlertCircle,
  Trash2,
  User,
  Pencil,
  X,
  Check,
  Plus,
  Tag,
} from 'lucide-react'

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <Circle className="h-3.5 w-3.5 text-status-open-foreground" />,
  in_progress: <Loader2 className="h-3.5 w-3.5 text-status-in-progress-foreground" />,
  waiting: <Clock className="h-3.5 w-3.5 text-status-waiting-foreground" />,
  resolved: <CheckCircle className="h-3.5 w-3.5 text-status-resolved-foreground" />,
  closed: <XCircle className="h-3.5 w-3.5 text-status-closed-foreground" />,
}

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  urgent: <AlertCircle className="h-3.5 w-3.5 text-priority-urgent-foreground" />,
  high: <AlertCircle className="h-3.5 w-3.5 text-priority-high-foreground" />,
  medium: <AlertCircle className="h-3.5 w-3.5 text-priority-medium-foreground" />,
  low: <AlertCircle className="h-3.5 w-3.5 text-priority-low-foreground" />,
}

interface IssueDetail {
  id: number
  issueKey: string
  title: string
  content: string | null
  status: string
  priority: string
  type: string
  isPrivate: boolean
  dueDate: string | null
  createdAt: string
  updatedAt: string
  reporter: { id: string; name: string | null; email: string; image: string | null } | null
  assignee: { id: string; name: string | null; email: string; image: string | null } | null
  project: { id: number; code: string; name: string } | null
  comments: Array<{
    id: number
    content: string
    isInternal: boolean
    createdAt: string
    author: { id: string; name: string | null; image: string | null } | null
  }>
  issueLabels: Array<{
    label: { id: number; name: string; color: string }
  }>
}

export default function IssueDetailPage({
  params,
}: {
  params: Promise<{ code: string; issueKey: string }>
}) {
  const { code, issueKey } = use(params)
  const t = useTranslations()
  const router = useRouter()
  const { data: session } = useSession()
  const {
    data: issue,
    isLoading,
    isError,
    error: issueError,
  } = useIssue(issueKey) as {
    data: IssueDetail | undefined
    isLoading: boolean
    isError: boolean
    error: Error | null
  }

  const updateIssueMutation = useUpdateIssue(issueKey)
  const statusMutation = useUpdateIssueStatus(issueKey)
  const priorityMutation = useUpdateIssuePriority(issueKey)
  const assigneeMutation = useUpdateIssueAssignee(issueKey)
  const deleteMutation = useDeleteIssue()

  // Comments
  const { data: comments = [] } = useIssueComments(issueKey)
  const createCommentMutation = useCreateComment(issueKey)
  const updateCommentMutation = useUpdateComment(issueKey)
  const deleteCommentMutation = useDeleteComment(issueKey)

  // Labels
  const { data: labelsResult } = useLabels()
  const addLabelMutation = useAddLabelToIssue(issueKey)
  const removeLabelMutation = useRemoveLabelFromIssue(issueKey)

  // Assignable users
  const { data: projectUsers = [] } = useProjectUsers(issue?.project?.id)

  // UI state
  const [commentContent, setCommentContent] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [assigneeOpen, setAssigneeOpen] = useState(false)

  // Title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Content editing
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [editContent, setEditContent] = useState('')

  // Comment editing
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editCommentContent, setEditCommentContent] = useState('')

  // Label picker
  const [labelPickerOpen, setLabelPickerOpen] = useState(false)

  const userId = session?.user?.id
  const userRole = session?.user?.role
  const isStaff = checkStaff(userRole)
  const isAdmin = checkAdmin(userRole)
  const isReporter = issue?.reporter?.id === userId
  const canEditIssue = isStaff || isReporter

  // Focus title input when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const handleTitleSave = useCallback(() => {
    if (!editTitle.trim() || editTitle.trim() === issue?.title) {
      setIsEditingTitle(false)
      return
    }
    updateIssueMutation.mutate(
      { title: editTitle.trim() },
      {
        onSuccess: () => {
          setIsEditingTitle(false)
          toast.success(t('issues.titleUpdated'))
        },
      }
    )
  }, [editTitle, issue?.title, updateIssueMutation, t])

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleTitleSave()
      } else if (e.key === 'Escape') {
        setIsEditingTitle(false)
      }
    },
    [handleTitleSave]
  )

  const handleContentSave = useCallback(() => {
    updateIssueMutation.mutate(
      { content: editContent || null },
      {
        onSuccess: () => {
          setIsEditingContent(false)
          toast.success(t('issues.contentUpdated'))
        },
      }
    )
  }, [editContent, updateIssueMutation, t])

  const handleCommentEditSave = useCallback(
    (commentId: number) => {
      if (!editCommentContent.trim()) return
      updateCommentMutation.mutate(
        { commentId, content: editCommentContent },
        {
          onSuccess: () => {
            setEditingCommentId(null)
            setEditCommentContent('')
            toast.success(t('comments.commentUpdated'))
          },
        }
      )
    },
    [editCommentContent, updateCommentMutation, t]
  )

  const handleDueDateChange = useCallback(
    (date: Date | null) => {
      const dueDate = date ? date.toISOString().split('T')[0] : null
      updateIssueMutation.mutate(
        { dueDate },
        {
          onSuccess: () => {
            toast.success(t('issues.dueDateUpdated'))
          },
        }
      )
    },
    [updateIssueMutation, t]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <BounceLoader />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{issueError?.message}</p>
      </div>
    )
  }

  if (!issue) {
    return (
      <div className="max-w-[900px] mx-auto px-6 py-10">
        <p className="text-sm text-muted-foreground">{t('errors.notFound')}</p>
      </div>
    )
  }

  const allLabels = labelsResult?.data ?? []
  const assignedLabelIds = new Set(issue.issueLabels.map(il => il.label.id))
  const availableLabels = allLabels.filter(l => !assignedLabelIds.has(l.id))

  function handleSubmitComment() {
    if (!commentContent.trim()) return
    createCommentMutation.mutate(
      { content: commentContent, isInternal },
      {
        onSuccess: () => {
          setCommentContent('')
          setIsInternal(false)
        },
      }
    )
  }

  return (
    <div className="max-w-[900px] mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <Link
        href={`/projects/${code}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ChevronLeft className="h-3 w-3" />
        {issue.project?.name ?? code}
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-muted-foreground">{issue.issueKey}</span>
          {issue.isPrivate && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {t('issues.private')}
            </Badge>
          )}
        </div>

        {/* Title — inline editing */}
        {isEditingTitle ? (
          <div className="flex items-center gap-2">
            <input
              ref={titleInputRef}
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="flex-1 text-2xl font-bold text-foreground bg-transparent border-b-2 border-primary outline-none py-0.5"
              disabled={updateIssueMutation.isPending}
            />
          </div>
        ) : (
          <h1
            className={`text-2xl font-bold text-foreground ${
              canEditIssue
                ? 'cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors'
                : ''
            }`}
            onClick={() => {
              if (canEditIssue) {
                setEditTitle(issue.title)
                setIsEditingTitle(true)
              }
            }}
          >
            {issue.title}
          </h1>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0 order-2 md:order-1">
          {/* Content — with edit toggle */}
          <div>
            {isEditingContent ? (
              <div className="space-y-2">
                <TiptapEditor
                  content={editContent}
                  onChange={setEditContent}
                  editable={true}
                  placeholder={t('issues.description')}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleContentSave}
                    disabled={updateIssueMutation.isPending}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {t('common.save')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingContent(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="group/content relative">
                {canEditIssue && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditContent(issue.content ?? '')
                      setIsEditingContent(true)
                    }}
                    className="absolute top-0 right-0 p-1.5 rounded-md md:opacity-0 md:group-hover/content:opacity-100 hover:bg-muted transition-all z-10"
                    aria-label={t('issues.editContent')}
                    title={t('issues.editContent')}
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
                {issue.content ? (
                  <TiptapEditor content={issue.content} onChange={() => {}} editable={false} />
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {t('issues.noDescription')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="mt-8 border-t border-border pt-6">
            <AttachmentList issueKey={issueKey} />
          </div>

          {/* Comments section */}
          <div className="mt-8 border-t border-border pt-6">
            <h2 className="text-sm font-medium text-foreground mb-4">
              {t('issues.comments')} ({comments.length})
            </h2>

            {/* Comment list */}
            {comments.length > 0 && (
              <div className="space-y-3 mb-6">
                {comments.map(comment => {
                  const isOwnComment = comment.author?.id === userId
                  const isEditing = editingCommentId === comment.id

                  return (
                    <div
                      key={comment.id}
                      className={`p-3 rounded-md group ${
                        comment.isInternal
                          ? 'bg-internal border border-internal-border'
                          : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium text-foreground">
                          {comment.author?.name ?? t('common.unknown')}
                        </span>
                        {comment.isInternal && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 h-4 text-internal-foreground border-internal-border"
                          >
                            {t('comments.internal')}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground flex-1">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {/* Edit button — own comments only */}
                          {isOwnComment && !isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(comment.id)
                                setEditCommentContent(comment.content)
                              }}
                              className="p-1 rounded md:opacity-0 md:group-hover:opacity-100 hover:bg-accent transition-all"
                              aria-label={t('comments.editComment')}
                              title={t('comments.editComment')}
                            >
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </button>
                          )}
                          {/* Delete button */}
                          {(isAdmin || isOwnComment) && !isEditing && (
                            <button
                              type="button"
                              onClick={() => deleteCommentMutation.mutate(comment.id)}
                              disabled={deleteCommentMutation.isPending}
                              className="p-1 rounded md:opacity-0 md:group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                              aria-label={t('comments.deleteComment')}
                              title={t('comments.deleteComment')}
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Comment content — edit mode or read mode */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <TiptapEditor
                            content={editCommentContent}
                            onChange={setEditCommentContent}
                            editable={true}
                            placeholder={t('comments.placeholder')}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleCommentEditSave(comment.id)}
                              disabled={
                                updateCommentMutation.isPending || !editCommentContent.trim()
                              }
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              {t('common.save')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingCommentId(null)
                                setEditCommentContent('')
                              }}
                            >
                              {t('common.cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="text-sm text-foreground prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: comment.content }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Comment form */}
            <div className="space-y-2">
              <TiptapEditor
                content={commentContent}
                onChange={setCommentContent}
                placeholder={t('comments.placeholder')}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isStaff && (
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={e => setIsInternal(e.target.checked)}
                        className="rounded border-border"
                      />
                      {t('comments.internal')}
                    </label>
                  )}
                </div>
                <Button
                  size="sm"
                  disabled={createCommentMutation.isPending || !commentContent.trim()}
                  onClick={handleSubmitComment}
                >
                  {createCommentMutation.isPending
                    ? t('validation.submitting')
                    : t('comments.addComment')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar — property editor */}
        <div className="w-full md:w-[220px] shrink-0 space-y-4 order-1 md:order-2">
          {/* Status */}
          <PropertyRow label={t('issues.status')}>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={t('issues.status')}>
              {STATUSES.map(s => {
                const canChange = isStaff || (userRole === 'customer' && s === 'resolved')
                return (
                  <button
                    key={s}
                    role="radio"
                    aria-checked={issue.status === s}
                    onClick={() => canChange && statusMutation.mutate(s)}
                    disabled={!canChange || statusMutation.isPending}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                      issue.status === s
                        ? 'bg-accent text-foreground font-medium'
                        : canChange
                          ? 'text-muted-foreground hover:bg-muted'
                          : 'text-muted-foreground/40 cursor-not-allowed'
                    }`}
                  >
                    {STATUS_ICONS[s]}
                    {t(`status.${s}` as Parameters<typeof t>[0])}
                  </button>
                )
              })}
            </div>
          </PropertyRow>

          {/* Priority */}
          <PropertyRow label={t('issues.priority')}>
            <div
              className="flex flex-wrap gap-1"
              role="radiogroup"
              aria-label={t('issues.priority')}
            >
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  role="radio"
                  aria-checked={issue.priority === p}
                  onClick={() => isStaff && priorityMutation.mutate(p)}
                  disabled={!isStaff || priorityMutation.isPending}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                    issue.priority === p
                      ? 'bg-accent text-foreground font-medium'
                      : isStaff
                        ? 'text-muted-foreground hover:bg-muted'
                        : 'text-muted-foreground/40 cursor-not-allowed'
                  }`}
                >
                  {PRIORITY_ICONS[p]}
                  {t(`priority.${p}` as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
          </PropertyRow>

          {/* Type */}
          <PropertyRow label={t('issues.type')}>
            <span className="text-sm text-foreground">
              {t(`issueType.${issue.type}` as Parameters<typeof t>[0])}
            </span>
          </PropertyRow>

          {/* Assignee */}
          <PropertyRow label={t('issues.assignee')}>
            {isStaff ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAssigneeOpen(!assigneeOpen)}
                  onKeyDown={e => {
                    if (e.key === 'Escape' && assigneeOpen) {
                      e.preventDefault()
                      setAssigneeOpen(false)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-sm rounded-md hover:bg-muted transition-colors w-full text-left"
                  aria-expanded={assigneeOpen}
                  aria-haspopup="listbox"
                  aria-label={t('issues.assignee')}
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className={issue.assignee ? 'text-foreground' : 'text-muted-foreground'}>
                    {issue.assignee?.name ?? t('issues.unassigned')}
                  </span>
                </button>
                {assigneeOpen && (
                  <div
                    role="listbox"
                    aria-label={t('issues.assignee')}
                    className="absolute top-full left-0 mt-1 z-50 w-full min-w-[180px] bg-popover border border-border rounded-md shadow-lg py-1"
                  >
                    {/* Unassign option */}
                    <button
                      type="button"
                      role="option"
                      aria-selected={!issue.assignee}
                      onClick={() => {
                        assigneeMutation.mutate(null)
                        setAssigneeOpen(false)
                      }}
                      className="w-full px-3 py-1.5 text-xs text-left text-muted-foreground hover:bg-accent transition-colors"
                    >
                      {t('issues.unassigned')}
                    </button>
                    {projectUsers.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        role="option"
                        aria-selected={issue.assignee?.id === u.id}
                        onClick={() => {
                          assigneeMutation.mutate(u.id)
                          setAssigneeOpen(false)
                        }}
                        className={`w-full px-3 py-1.5 text-xs text-left hover:bg-accent transition-colors ${
                          issue.assignee?.id === u.id
                            ? 'bg-accent text-foreground font-medium'
                            : 'text-foreground'
                        }`}
                      >
                        {u.name ?? u.email}
                        <span className="text-muted-foreground ml-1">
                          ({t(`roles.${u.role}` as Parameters<typeof t>[0])})
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm text-foreground">
                {issue.assignee?.name ?? (
                  <span className="text-muted-foreground">{t('issues.unassigned')}</span>
                )}
              </span>
            )}
          </PropertyRow>

          {/* Reporter */}
          <PropertyRow label={t('issues.reporter')}>
            <span className="text-sm text-foreground">{issue.reporter?.name ?? '—'}</span>
          </PropertyRow>

          {/* Due Date */}
          <PropertyRow label={t('issues.dueDate')}>
            {isStaff ? (
              <InlineDatePicker
                selected={issue.dueDate ? new Date(issue.dueDate) : null}
                onChange={handleDueDateChange}
              />
            ) : (
              <span className="text-sm text-foreground">
                {issue.dueDate ? (
                  new Date(issue.dueDate).toLocaleDateString()
                ) : (
                  <span className="text-muted-foreground">{t('common.noDate')}</span>
                )}
              </span>
            )}
          </PropertyRow>

          {/* Labels */}
          <PropertyRow label={t('issues.labels')}>
            <div className="space-y-1.5">
              {/* Existing labels */}
              {issue.issueLabels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {issue.issueLabels.map(({ label }) => (
                    <Badge
                      key={label.id}
                      variant="secondary"
                      className="text-xs px-2 py-0.5 gap-1 group/label"
                      style={{
                        backgroundColor: `${label.color}20`,
                        color: label.color,
                      }}
                    >
                      {label.name}
                      {isStaff && (
                        <button
                          type="button"
                          onClick={() => removeLabelMutation.mutate(label.id)}
                          className="md:opacity-0 md:group-hover/label:opacity-100 transition-opacity"
                          aria-label={t('issues.removeLabel')}
                          title={t('issues.removeLabel')}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Add label button */}
              {isStaff && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setLabelPickerOpen(!labelPickerOpen)}
                    onKeyDown={e => {
                      if (e.key === 'Escape' && labelPickerOpen) {
                        e.preventDefault()
                        setLabelPickerOpen(false)
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground rounded-md hover:bg-muted transition-colors"
                    aria-expanded={labelPickerOpen}
                    aria-haspopup="listbox"
                    aria-label={t('issues.addLabel')}
                  >
                    <Plus className="h-3 w-3" />
                    {t('issues.addLabel')}
                  </button>
                  {labelPickerOpen && availableLabels.length > 0 && (
                    <div
                      role="listbox"
                      aria-label={t('issues.labels')}
                      className="absolute top-full left-0 mt-1 z-50 w-full min-w-[160px] bg-popover border border-border rounded-md shadow-lg py-1 max-h-[200px] overflow-y-auto"
                    >
                      {availableLabels.map(label => (
                        <button
                          key={label.id}
                          type="button"
                          role="option"
                          aria-selected={false}
                          onClick={() => {
                            addLabelMutation.mutate(label.id)
                            setLabelPickerOpen(false)
                          }}
                          className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent transition-colors flex items-center gap-2"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="text-foreground truncate">{label.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {labelPickerOpen && availableLabels.length === 0 && (
                    <div className="absolute top-full left-0 mt-1 z-50 w-full min-w-[160px] bg-popover border border-border rounded-md shadow-lg py-2 px-3">
                      <span className="text-xs text-muted-foreground">{t('labels.noLabels')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </PropertyRow>

          {/* Created */}
          <PropertyRow label={t('issues.created')}>
            <span className="text-xs text-muted-foreground">
              {new Date(issue.createdAt).toLocaleString()}
            </span>
          </PropertyRow>

          {/* Delete */}
          {isAdmin && (
            <div className="pt-4 border-t border-border">
              <ConfirmDeleteButton
                onDelete={() =>
                  deleteMutation.mutate(issueKey, {
                    onSuccess: () => {
                      toast.success(t('issues.deleteIssue'))
                      router.push(`/projects/${code}`)
                    },
                  })
                }
                isPending={deleteMutation.isPending}
                confirmLabel={t('issues.deleteIssue')}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground block mb-1">{label}</span>
      {children}
    </div>
  )
}
