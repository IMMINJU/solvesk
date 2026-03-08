import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query-keys'
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectListItem,
} from '@/features/project/services/project.service'

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateProjectInput) => api.post<ProjectListItem>('/api/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectInput }) =>
      api.patch<ProjectListItem>(`/api/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() })
    },
  })
}
