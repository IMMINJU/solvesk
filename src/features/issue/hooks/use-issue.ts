import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query-keys'

export function useIssue(issueKey: string) {
  return useQuery({
    queryKey: queryKeys.issues.detail(issueKey),
    queryFn: () => api.get(`/api/issues/${issueKey}`),
    enabled: !!issueKey,
  })
}
