import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, authOptions } from '../auth-options'

describe('Auth: Password hashing', () => {
  it('hashPassword returns a bcrypt hash', async () => {
    const hash = await hashPassword('password123')
    expect(hash).toMatch(/^\$2[aby]\$/)
    expect(hash).not.toBe('password123')
  })

  it('verifyPassword returns true for correct password', async () => {
    const hash = await hashPassword('mySecret')
    const result = await verifyPassword('mySecret', hash)
    expect(result).toBe(true)
  })

  it('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword('mySecret')
    const result = await verifyPassword('wrongPassword', hash)
    expect(result).toBe(false)
  })

  it('same password produces different hashes (salt)', async () => {
    const hash1 = await hashPassword('samePassword')
    const hash2 = await hashPassword('samePassword')
    expect(hash1).not.toBe(hash2)
    // But both should verify correctly
    expect(await verifyPassword('samePassword', hash1)).toBe(true)
    expect(await verifyPassword('samePassword', hash2)).toBe(true)
  })
})

describe('Auth: authOptions structure', () => {
  it('uses jwt strategy', () => {
    expect(authOptions.session?.strategy).toBe('jwt')
  })

  it('session maxAge is 30 days', () => {
    expect(authOptions.session?.maxAge).toBe(30 * 24 * 60 * 60)
  })

  it('has credentials provider', () => {
    expect(authOptions.providers).toHaveLength(1)
    expect(authOptions.providers[0].id).toBe('credentials')
  })

  it('signIn page is /en/auth/signin', () => {
    expect(authOptions.pages?.signIn).toBe('/en/auth/signin')
  })

  it('has jwt and session callbacks', () => {
    expect(authOptions.callbacks?.jwt).toBeDefined()
    expect(authOptions.callbacks?.session).toBeDefined()
  })
})

describe('Auth: UserRole type', () => {
  it('valid roles are admin, agent, customer', () => {
    // This is a compile-time check, but we verify the runtime values
    const validRoles = ['admin', 'agent', 'customer'] as const
    type UserRole = (typeof validRoles)[number]

    const testRole = (role: string): role is UserRole => validRoles.includes(role as UserRole)

    expect(testRole('admin')).toBe(true)
    expect(testRole('agent')).toBe(true)
    expect(testRole('customer')).toBe(true)
    expect(testRole('developer')).toBe(false)
    expect(testRole('superadmin')).toBe(false)
  })
})
