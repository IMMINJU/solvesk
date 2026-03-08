'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query-keys'
import type { ProjectMember } from '@/features/project/services/project-membership.service'

export function useProjectMembers(projectId: number | undefined) {
  return useQuery<ProjectMember[]>({
    queryKey: queryKeys.projects.members(projectId!),
    queryFn: () => api.get<ProjectMember[]>(`/api/projects/${projectId}/members`),
    enabled: !!projectId,
  })
}
