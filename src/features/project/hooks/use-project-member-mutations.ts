'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query-keys'

export function useAddProjectMember(projectId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => api.post(`/api/projects/${projectId}/members`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.members(projectId),
      })
      // Also refresh project users (assignable users list)
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.users(projectId),
      })
    },
  })
}

export function useRemoveProjectMember(projectId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => api.delete(`/api/projects/${projectId}/members`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.members(projectId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.users(projectId),
      })
    },
  })
}
