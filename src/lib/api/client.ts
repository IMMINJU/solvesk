export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    const message = error.error || error.message || 'API request failed'
    throw new ApiError(message, response.status, error)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

export const api = {
  get: <T>(url: string) => request<T>(url),

  post: <T>(url: string, data?: unknown) =>
    request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(url: string, data?: unknown) =>
    request<T>(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(url: string, data?: unknown) =>
    request<T>(url, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    }),
}
