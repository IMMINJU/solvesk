import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query-keys'
import { PAGINATION } from '@/config/limits'
import type { PaginatedResponse } from '@/lib/api/types'
import type { UserListItem } from '@/features/user/services/user.service'

interface UseUsersParams {
  page?: number
  pageSize?: number
}

export function useUsers({ page = 1, pageSize = PAGINATION.defaultPageSize }: UseUsersParams = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))

  return useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: () => api.get<PaginatedResponse<UserListItem>>(`/api/users?${params.toString()}`),
  })
}
