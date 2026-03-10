'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query-keys'

interface Attachment {
  id: number
  fileName: string
  fileUrl: string
  fileSize: number | null
  mimeType: string | null
  uploadedBy: string
  createdAt: string
  uploader?: { id: string; name: string | null } | null
}

export function useIssueAttachments(issueKey: string) {
  return useQuery<Attachment[]>({
    queryKey: queryKeys.attachments.byIssue(issueKey),
    queryFn: () => api.get<Attachment[]>(`/api/issues/${issueKey}/attachments`),
    enabled: !!issueKey,
  })
}

export function useAddAttachments(issueKey: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (
      files: Array<{
        fileName: string
        fileUrl: string
        fileSize?: number
        mimeType?: string
      }>
    ) =>
      api.post(`/api/issues/${issueKey}/attachments`, {
        attachments: files,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attachments.byIssue(issueKey) })
    },
  })
}

export function useDeleteAttachment(issueKey: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (attachmentId: number) => api.delete(`/api/attachments/${attachmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attachments.byIssue(issueKey) })
    },
  })
}
