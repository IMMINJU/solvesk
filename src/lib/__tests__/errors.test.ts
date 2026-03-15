import { describe, it, expect } from 'vitest'
import {
  AppError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../errors'

describe('Errors: AppError', () => {
  it('has default code INTERNAL_ERROR and status 500', () => {
    const error = new AppError('something broke')
    expect(error.code).toBe('INTERNAL_ERROR')
    expect(error.statusCode).toBe(500)
    expect(error.message).toBe('something broke')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AppError)
  })
})

describe('Errors: AuthError', () => {
  it('has status 401 and UNAUTHORIZED code', () => {
    const error = new AuthError()
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Authentication required')
  })

  it('accepts custom message', () => {
    const error = new AuthError('Token expired')
    expect(error.message).toBe('Token expired')
  })
})

describe('Errors: ForbiddenError', () => {
  it('has status 403 and FORBIDDEN code', () => {
    const error = new ForbiddenError()
    expect(error.statusCode).toBe(403)
    expect(error.code).toBe('FORBIDDEN')
  })
})

describe('Errors: NotFoundError', () => {
  it('has status 404 and includes resource name', () => {
    const error = new NotFoundError('Issue')
    expect(error.statusCode).toBe(404)
    expect(error.message).toBe('Issue not found')
  })

  it('uses default resource name', () => {
    const error = new NotFoundError()
    expect(error.message).toBe('Resource not found')
  })
})

describe('Errors: ValidationError', () => {
  it('has status 400 and carries field errors', () => {
    const error = new ValidationError({ email: 'Invalid email' })
    expect(error.statusCode).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.errors).toEqual({ email: 'Invalid email' })
  })
})

describe('Errors: ConflictError', () => {
  it('has status 409', () => {
    const error = new ConflictError()
    expect(error.statusCode).toBe(409)
    expect(error.code).toBe('CONFLICT')
  })
})
