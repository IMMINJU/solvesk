import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { fromZodError } from 'zod-validation-error'
import { AppError, ValidationError } from './errors'

/**
 * Extract PostgreSQL error code from Drizzle errors
 */
function extractPgErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  const e = error as { cause?: { code?: string } }
  const code = e.cause?.code
  if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code
  return null
}

/**
 * API error handler — converts errors to NextResponse
 *
 * Priority:
 * 1. ZodError (schema validation)
 * 2. ValidationError (field errors)
 * 3. AppError (custom errors)
 * 4. PostgreSQL errors (via Drizzle)
 * 5. Generic Error
 */
export function handleApiError(error: unknown): NextResponse {
  // 1. ZodError
  if (error instanceof ZodError) {
    const message = fromZodError(error, {
      prefix: 'Validation error',
      prefixSeparator: ': ',
      issueSeparator: ', ',
    }).message
    return NextResponse.json({ error: message, code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  // 2. ValidationError
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message, code: error.code, errors: error.errors },
      { status: error.statusCode }
    )
  }

  // 3. AppError
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }

  // 4. PostgreSQL errors
  const pgCode = extractPgErrorCode(error)
  if (pgCode) {
    const status = pgCode.startsWith('22') || pgCode.startsWith('23') ? 400 : 500
    return NextResponse.json({ error: `DB_ERROR: ${pgCode}` }, { status })
  }

  // 5. Generic Error
  const message = error instanceof Error ? error.message : String(error)
  return NextResponse.json(
    { error: message || 'UNKNOWN_ERROR', code: 'INTERNAL_ERROR' },
    { status: 500 }
  )
}
