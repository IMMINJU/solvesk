/**
 * Standard pagination metadata for API list responses.
 *
 * All paginated endpoints return:
 * { data: T[], pagination: PaginationMeta }
 */
export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/**
 * Standard paginated API response shape.
 *
 * Usage in hooks:
 *   api.get<PaginatedResponse<Issue>>("/api/issues?page=1")
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}
