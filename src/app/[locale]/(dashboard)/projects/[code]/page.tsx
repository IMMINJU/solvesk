'use client'

import { use, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { Link } from '@/i18n/navigation'
import { useProjectByCode } from '@/features/project/hooks/use-projects'
import { useProjectIssues } from '@/features/issue/hooks/use-issues'
import { CreateIssueDialog } from '@/components/issues/create-issue-dialog'
import { BounceLoader } from '@/components/ui/bounce-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/avatar'
import { STATUSES, PRIORITIES, STATUS_COLORS, PRIORITY_COLORS } from '@/config/issue'
import { PAGINATION } from '@/config/limits'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, Search, FolderKanban, Plus, AlertCircle, ArrowUp } from 'lucide-react'

export default function ProjectDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const t = useTranslations()
  const { data: session } = useSession()
  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
    error: projectErr,
  } = useProjectByCode(code)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>()
  const [sortBy, setSortBy] = useState<string>('newest')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: issueResult, isLoading: issuesLoading } = useProjectIssues({
    projectId: project?.id ?? 0,
    page,
    search: search || undefined,
    status: statusFilter,
    priority: priorityFilter,
    sortBy,
  })

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <BounceLoader />
      </div>
    )
  }

  if (projectError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{projectErr.message}</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-[900px] mx-auto px-6 py-10">
        <p className="text-sm text-muted-foreground">{t('errors.notFound')}</p>
      </div>
    )
  }

  const issues = issueResult?.data ?? []
  const total = issueResult?.pagination?.total ?? 0
  const pageSize = issueResult?.pagination?.pageSize ?? PAGINATION.defaultPageSize
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="max-w-[900px] mx-auto px-6 py-10">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ChevronLeft className="h-3 w-3" />
        {t('projects.title')}
      </Link>

      {/* Project header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <FolderKanban className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">{project.code}</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-foreground">{project.name}</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-1.5 text-sm"
          >
            <Plus className="h-4 w-4" />
            {t('issues.createIssue')}
          </Button>
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={t('common.search')}
              className="pl-8 h-8 text-xs"
            />
          </div>

          {/* Sort */}
          <Select
            value={sortBy}
            onValueChange={v => {
              setSortBy(v)
              setPage(1)
            }}
          >
            <SelectTrigger size="sm" className="h-8 text-xs min-w-[120px]">
              <SelectValue placeholder={t('issues.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t('issues.sortNewest')}</SelectItem>
              <SelectItem value="oldest">{t('issues.sortOldest')}</SelectItem>
              <SelectItem value="priority">{t('issues.sortPriority')}</SelectItem>
              <SelectItem value="updated">{t('issues.sortUpdated')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status + Priority filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STATUSES.map(status => (
            <Button
              key={status}
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter(statusFilter === status ? undefined : status)
                setPage(1)
              }}
              className={`text-xs h-7 px-2 ${
                statusFilter === status ? 'bg-accent text-foreground' : 'text-muted-foreground'
              }`}
            >
              {t(`status.${status}` as Parameters<typeof t>[0])}
            </Button>
          ))}
          <span className="w-px h-4 bg-border mx-1" />
          {PRIORITIES.map(priority => (
            <Button
              key={priority}
              variant="ghost"
              size="sm"
              onClick={() => {
                setPriorityFilter(priorityFilter === priority ? undefined : priority)
                setPage(1)
              }}
              className={`text-xs h-7 px-2 ${
                priorityFilter === priority ? 'bg-accent text-foreground' : 'text-muted-foreground'
              }`}
            >
              {t(`priority.${priority}` as Parameters<typeof t>[0])}
            </Button>
          ))}
        </div>
      </div>

      {/* Issue list */}
      {issuesLoading ? (
        <div className="flex items-center justify-center py-12">
          <BounceLoader />
        </div>
      ) : issues.length > 0 ? (
        <>
          {/* Desktop table header */}
          <div
            className="hidden md:grid grid-cols-[80px_1fr_80px_80px_36px] gap-3 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border"
            role="row"
          >
            <span role="columnheader">{t('issues.key')}</span>
            <span role="columnheader">{t('issues.issueTitle')}</span>
            <span role="columnheader">{t('issues.status')}</span>
            <button
              type="button"
              role="columnheader"
              onClick={() => {
                setSortBy(sortBy === 'priority' ? 'newest' : 'priority')
                setPage(1)
              }}
              className="inline-flex items-center gap-0.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t('issues.sortByPriority')}
            >
              {t('issues.priority')}
              {sortBy === 'priority' && <ArrowUp className="h-3 w-3 text-foreground" />}
            </button>
            <span />
          </div>

          {/* Desktop rows */}
          <div className="hidden md:block">
            {issues.map(issue => (
              <Link
                key={issue.id}
                href={`/projects/${code}/issues/${issue.issueKey}`}
                className="grid grid-cols-[80px_1fr_80px_80px_36px] gap-3 items-center px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
              >
                <span className="text-xs text-muted-foreground font-mono">{issue.issueKey}</span>
                <span className="text-sm text-foreground truncate">{issue.title}</span>
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 h-5 font-normal justify-center ${STATUS_COLORS[issue.status] ?? ''}`}
                >
                  {t(`status.${issue.status}` as Parameters<typeof t>[0])}
                </Badge>
                <span
                  className={`text-xs ${PRIORITY_COLORS[issue.priority] ?? 'text-muted-foreground'}`}
                >
                  {t(`priority.${issue.priority}` as Parameters<typeof t>[0])}
                </span>
                <span className="flex justify-end">
                  {issue.assignee ? (
                    <Avatar
                      name={issue.assignee.name ?? undefined}
                      image={issue.assignee.image}
                      size="xs"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full border border-dashed border-muted-foreground/30" />
                  )}
                </span>
              </Link>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-1">
            {issues.map(issue => (
              <Link
                key={issue.id}
                href={`/projects/${code}/issues/${issue.issueKey}`}
                className="block px-3 py-3 rounded-md hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground font-mono">{issue.issueKey}</span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 h-5 font-normal ${STATUS_COLORS[issue.status] ?? ''}`}
                  >
                    {t(`status.${issue.status}` as Parameters<typeof t>[0])}
                  </Badge>
                  <span
                    className={`text-[10px] ml-auto ${PRIORITY_COLORS[issue.priority] ?? 'text-muted-foreground'}`}
                  >
                    {t(`priority.${issue.priority}` as Parameters<typeof t>[0])}
                  </span>
                </div>
                <p className="text-sm text-foreground line-clamp-1">{issue.title}</p>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="ghost"
                size="xs"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t('common.back')}
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="xs"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                {t('common.next')}
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground py-8">{t('issues.noIssues')}</p>
      )}

      {/* Create Issue Dialog */}
      {project && (
        <CreateIssueDialog open={createOpen} onOpenChange={setCreateOpen} projectId={project.id} />
      )}
    </div>
  )
}
