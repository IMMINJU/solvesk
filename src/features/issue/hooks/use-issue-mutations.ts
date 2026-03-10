import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query-keys'
import type { CreateIssueInput, UpdateIssueInput } from '@/features/issue/services/issue.service'

export function useCreateIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateIssueInput) => api.post('/api/issues', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.all() })
    },
  })
}

export function useUpdateIssue(issueKey: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateIssueInput) => api.patch(`/api/issues/${issueKey}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueKey) })
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.all() })
    },
  })
}

export function useUpdateIssueStatus(issueKey: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (status: string) => api.patch(`/api/issues/${issueKey}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueKey) })
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.all() })
    },
  })
}

export function useUpdateIssueAssignee(issueKey: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assigneeId: string | null) =>
      api.patch(`/api/issues/${issueKey}/assign`, { assigneeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueKey) })
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.all() })
    },
  })
}

export function useUpdateIssuePriority(issueKey: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (priority: string) => api.patch(`/api/issues/${issueKey}/priority`, { priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueKey) })
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.all() })
    },
  })
}

export function useDeleteIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (issueKey: string) => api.delete(`/api/issues/${issueKey}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.all() })
    },
  })
}
