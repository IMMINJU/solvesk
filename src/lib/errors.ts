export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number

  constructor(message: string, code: ErrorCode = 'INTERNAL_ERROR', statusCode: number = 500) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'FORBIDDEN', 403)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404)
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string>

  constructor(errors: Record<string, string>) {
    super('Validation failed', 'VALIDATION_ERROR', 400)
    this.errors = errors
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 'CONFLICT', 409)
  }
}
