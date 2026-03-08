'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query-keys'

interface ProjectUser {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
}

export function useProjectUsers(projectId: number | undefined) {
  return useQuery<ProjectUser[]>({
    queryKey: queryKeys.projects.users(projectId!),
    queryFn: () => api.get(`/api/projects/${projectId}/users`),
    enabled: !!projectId,
  })
}
