'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { Link } from '@/i18n/navigation'
import { useAllIssues } from '@/features/issue/hooks/use-issues'
import { useProjects } from '@/features/project/hooks/use-projects'
import { CreateIssueDialog } from '@/components/issues/create-issue-dialog'
import { BounceLoader } from '@/components/ui/bounce-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar } from '@/components/avatar'
import { STATUSES, PRIORITIES, STATUS_COLORS, PRIORITY_COLORS } from '@/config/issue'
import { PAGINATION } from '@/config/limits'
import { Search, FileText, Plus, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react'

export default function AllIssuesPage() {
  const t = useTranslations()
  const { data: session } = useSession()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>()
  const [projectFilter, setProjectFilter] = useState<number | undefined>()
  const [sortBy, setSortBy] = useState<string>('newest')
  const [createOpen, setCreateOpen] = useState(false)

  const {
    data: issueResult,
    isLoading,
    isError,
    error,
  } = useAllIssues({
    page,
    search: search || undefined,
    status: statusFilter,
    priority: priorityFilter,
    projectId: projectFilter,
    sortBy,
  })

  const { data: projectList } = useProjects()

  const issues = issueResult?.data ?? []
  const total = issueResult?.pagination?.total ?? 0
  const pageSize = issueResult?.pagination?.pageSize ?? PAGINATION.defaultPageSize
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-foreground">{t('issues.allIssues')}</h1>
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
        <p className="text-sm text-muted-foreground mt-1">
          {total} {t('issues.title').toLowerCase()}
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Search + Project filter */}
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

          {/* Project filter */}
          {projectList && projectList.length > 1 && (
            <Select
              value={projectFilter ? String(projectFilter) : 'all'}
              onValueChange={v => {
                setProjectFilter(v === 'all' ? undefined : Number(v))
                setPage(1)
              }}
            >
              <SelectTrigger size="sm" className="h-8 text-xs min-w-[140px]">
                <SelectValue placeholder={t('issues.project')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('issues.project')}</SelectItem>
                {projectList.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

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
      {isError ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <BounceLoader />
        </div>
      ) : issues.length > 0 ? (
        <>
          {/* Desktop table header */}
          <div
            className="hidden md:grid grid-cols-[80px_1fr_100px_80px_80px_36px] gap-3 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border"
            role="row"
          >
            <span role="columnheader">{t('issues.key')}</span>
            <span role="columnheader">{t('issues.issueTitle')}</span>
            <span role="columnheader">{t('issues.project')}</span>
            <button
              type="button"
              role="columnheader"
              aria-sort={sortBy === 'newest' || sortBy === 'oldest' ? undefined : undefined}
              onClick={() => {
                setSortBy('newest')
                setPage(1)
              }}
              className="text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t('issues.sortByStatus')}
            >
              {t('issues.status')}
            </button>
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
                href={`/projects/${issue.project?.code}/issues/${issue.issueKey}`}
                className="grid grid-cols-[80px_1fr_100px_80px_80px_36px] gap-3 items-center px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
              >
                <span className="text-xs text-muted-foreground font-mono">{issue.issueKey}</span>
                <span className="text-sm text-foreground truncate">{issue.title}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {issue.project?.name}
                </span>
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
                href={`/projects/${issue.project?.code}/issues/${issue.issueKey}`}
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
                <p className="text-xs text-muted-foreground mt-0.5">{issue.project?.name}</p>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="ghost"
                size="sm"
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
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                {t('common.next')}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{t('issues.noIssues')}</p>
        </div>
      )}

      {/* Create Issue Dialog (no fixed project — shows selector) */}
      <CreateIssueDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
