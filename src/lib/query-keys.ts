/**
 * Centralized React Query key factory.
 * All query keys should be referenced from here — never hardcode strings.
 *
 * Pattern: queryKeys.{domain}.{scope}(params?)
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys#use-query-key-factories
 */
export const queryKeys = {
  issues: {
    all: () => ['issues'] as const,
    lists: () => ['issues', 'all'] as const,
    list: (params: Record<string, unknown>) => ['issues', 'all', params] as const,
    projectLists: () => ['issues', 'project'] as const,
    projectList: (projectId: number, params: Record<string, unknown>) =>
      ['issues', 'project', projectId, params] as const,
    detail: (issueKey: string) => ['issues', issueKey] as const,
  },

  comments: {
    byIssue: (issueKey: string) => ['comments', issueKey] as const,
  },

  attachments: {
    byIssue: (issueKey: string) => ['attachments', issueKey] as const,
  },

  projects: {
    all: () => ['projects'] as const,
    detail: (projectId: number) => ['projects', projectId] as const,
    byCode: (code: string) => ['projects', 'code', code] as const,
    users: (projectId: number) => ['project-users', projectId] as const,
    members: (projectId: number) => ['project-members', projectId] as const,
  },

  users: {
    all: () => ['users'] as const,
    detail: (userId: string) => ['users', userId] as const,
  },

  dashboard: {
    stats: () => ['dashboard', 'stats'] as const,
  },

  notifications: {
    all: () => ['notifications'] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },

  labels: {
    all: () => ['labels'] as const,
  },
} as const
