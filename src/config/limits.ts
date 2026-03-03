export const RATE_LIMITS = {
  API: { limit: 10, windowMs: 10_000 },
  READ: { limit: 30, windowMs: 10_000 },
  LOGIN: { limit: 5, windowMs: 15 * 60_000 },
  CREATE_ISSUE: { limit: 5, windowMs: 60_000 },
  CREATE_COMMENT: { limit: 3, windowMs: 10_000 },
} as const

export const EDITOR_IMAGE_MAX_SIZE = 10 * 1024 * 1024 // 10MB

export const FILE_LIMITS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB per file
  maxTotalSize: 500 * 1024 * 1024, // 500MB per minute
  maxFilesPerMinute: 20,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const

export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
} as const
