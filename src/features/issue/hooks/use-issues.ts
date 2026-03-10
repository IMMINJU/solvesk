import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query-keys'
import { PAGINATION } from '@/config/limits'
import type { PaginatedResponse } from '@/lib/api/types'
import type { IssueListItem } from '@/features/issue/services/issue.service'

interface UseProjectIssuesParams {
  projectId: number
  page?: number
  pageSize?: number
  status?: string
  priority?: string
  search?: string
  sortBy?: string
}

export function useProjectIssues({
  projectId,
  page = 1,
  pageSize = PAGINATION.defaultPageSize,
  status,
  priority,
  search,
  sortBy,
}: UseProjectIssuesParams) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  if (status) params.set('status', status)
  if (priority) params.set('priority', priority)
  if (search) params.set('search', search)
  if (sortBy) params.set('sortBy', sortBy)

  return useQuery({
    queryKey: queryKeys.issues.projectList(projectId, { page, status, priority, search, sortBy }),
    queryFn: () =>
      api.get<PaginatedResponse<IssueListItem>>(
        `/api/projects/${projectId}/issues?${params.toString()}`
      ),
    enabled: !!projectId,
  })
}

// ── All Issues (cross-project) ──────────────────

interface UseAllIssuesParams {
  page?: number
  pageSize?: number
  status?: string
  priority?: string
  assigneeId?: string
  projectId?: number
  search?: string
  sortBy?: string
}

export function useAllIssues({
  page = 1,
  pageSize = PAGINATION.defaultPageSize,
  status,
  priority,
  assigneeId,
  projectId,
  search,
  sortBy,
}: UseAllIssuesParams = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  if (status) params.set('status', status)
  if (priority) params.set('priority', priority)
  if (assigneeId) params.set('assigneeId', assigneeId)
  if (projectId) params.set('projectId', String(projectId))
  if (search) params.set('search', search)
  if (sortBy) params.set('sortBy', sortBy)

  return useQuery({
    queryKey: queryKeys.issues.list({
      page,
      status,
      priority,
      assigneeId,
      projectId,
      search,
      sortBy,
    }),
    queryFn: () => api.get<PaginatedResponse<IssueListItem>>(`/api/issues?${params.toString()}`),
  })
}
