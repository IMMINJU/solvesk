import { describe, it, expect } from 'vitest'
import { APP_CONFIG } from '../app'
import { RATE_LIMITS, FILE_LIMITS, PAGINATION } from '../limits'

describe('APP_CONFIG', () => {
  it('has app name Solvesk', () => {
    expect(APP_CONFIG.name).toBe('Solvesk')
  })

  it('supports en and ko locales', () => {
    expect(APP_CONFIG.locale.supported).toContain('en')
    expect(APP_CONFIG.locale.supported).toContain('ko')
    expect(APP_CONFIG.locale.default).toBe('en')
  })
})

describe('RATE_LIMITS', () => {
  it('has all required rate limit configs', () => {
    expect(RATE_LIMITS).toHaveProperty('API')
    expect(RATE_LIMITS).toHaveProperty('READ')
    expect(RATE_LIMITS).toHaveProperty('LOGIN')
    expect(RATE_LIMITS).toHaveProperty('CREATE_ISSUE')
    expect(RATE_LIMITS).toHaveProperty('CREATE_COMMENT')
  })

  it('each config has limit and windowMs', () => {
    for (const config of Object.values(RATE_LIMITS)) {
      expect(config).toHaveProperty('limit')
      expect(config).toHaveProperty('windowMs')
      expect(config.limit).toBeGreaterThan(0)
      expect(config.windowMs).toBeGreaterThan(0)
    }
  })
})

describe('FILE_LIMITS', () => {
  it('max file size is 10MB', () => {
    expect(FILE_LIMITS.maxFileSize).toBe(10 * 1024 * 1024)
  })

  it('allows common document types', () => {
    expect(FILE_LIMITS.allowedMimeTypes).toContain('image/jpeg')
    expect(FILE_LIMITS.allowedMimeTypes).toContain('image/png')
    expect(FILE_LIMITS.allowedMimeTypes).toContain('application/pdf')
  })
})

describe('PAGINATION', () => {
  it('has default and max page sizes', () => {
    expect(PAGINATION.defaultPageSize).toBe(20)
    expect(PAGINATION.maxPageSize).toBe(100)
    expect(PAGINATION.maxPageSize).toBeGreaterThan(PAGINATION.defaultPageSize)
  })
})
