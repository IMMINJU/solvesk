'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query-keys'
import type { PaginatedResponse } from '@/lib/api/types'

interface Label {
  id: number
  name: string
  color: string
  description: string | null
}

export function useLabels() {
  return useQuery<PaginatedResponse<Label>>({
    queryKey: queryKeys.labels.all(),
    queryFn: () => api.get('/api/labels?pageSize=100'),
  })
}

export function useAddLabelToIssue(issueKey: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (labelId: number) => api.post(`/api/issues/${issueKey}/labels`, { labelId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueKey) })
    },
  })
}

export function useRemoveLabelFromIssue(issueKey: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (labelId: number) => api.delete(`/api/issues/${issueKey}/labels`, { labelId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueKey) })
    },
  })
}
