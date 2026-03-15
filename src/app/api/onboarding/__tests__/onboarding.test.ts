import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const onboardingSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
})

describe('Onboarding Schema', () => {
  it('accepts valid input', () => {
    const result = onboardingSchema.safeParse({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = onboardingSchema.safeParse({
      name: '',
      email: 'admin@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = onboardingSchema.safeParse({
      name: 'Admin',
      email: 'not-an-email',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short password', () => {
    const result = onboardingSchema.safeParse({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('rejects name over 100 chars', () => {
    const result = onboardingSchema.safeParse({
      name: 'x'.repeat(101),
      email: 'admin@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password over 100 chars', () => {
    const result = onboardingSchema.safeParse({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'x'.repeat(101),
    })
    expect(result.success).toBe(false)
  })
})
