'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query-keys'

interface Comment {
  id: number
  content: string
  isInternal: boolean
  createdAt: string
  author: { id: string; name: string | null; image: string | null } | null
}

export function useIssueComments(issueKey: string) {
  return useQuery<Comment[]>({
    queryKey: queryKeys.comments.byIssue(issueKey),
    queryFn: () => api.get<Comment[]>(`/api/issues/${issueKey}/comments`),
    enabled: !!issueKey,
  })
}

export function useCreateComment(issueKey: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { content: string; isInternal?: boolean }) =>
      api.post(`/api/issues/${issueKey}/comments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byIssue(issueKey) })
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueKey) })
    },
  })
}

export function useUpdateComment(issueKey: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      api.patch(`/api/comments/${commentId}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byIssue(issueKey) })
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueKey) })
    },
  })
}

export function useDeleteComment(issueKey: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentId: number) => api.delete(`/api/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byIssue(issueKey) })
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueKey) })
    },
  })
}
