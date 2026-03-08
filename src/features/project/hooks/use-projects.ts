import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query-keys'
import type { ProjectListItem } from '@/features/project/services/project.service'

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects.all(),
    queryFn: () => api.get<ProjectListItem[]>('/api/projects'),
  })
}

export function useProject(projectId: number) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => api.get<ProjectListItem>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  })
}

export function useProjectByCode(code: string) {
  return useQuery({
    queryKey: queryKeys.projects.byCode(code),
    queryFn: () => api.get<ProjectListItem>(`/api/projects/code/${code}`),
    enabled: !!code,
  })
}
