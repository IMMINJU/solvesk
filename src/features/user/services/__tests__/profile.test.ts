import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Mirror the schemas from the API routes for testing
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
})

describe('updateProfileSchema', () => {
  it('accepts valid name', () => {
    const result = updateProfileSchema.safeParse({ name: 'John Doe' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = updateProfileSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name over 100 characters', () => {
    const result = updateProfileSchema.safeParse({ name: 'x'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('accepts 1 character name', () => {
    const result = updateProfileSchema.safeParse({ name: 'A' })
    expect(result.success).toBe(true)
  })
})

describe('changePasswordSchema', () => {
  it('accepts valid input', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass123',
      newPassword: 'newpass123',
    })
    expect(result.success).toBe(true)
  })

  it('requires current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'newpass123',
    })
    expect(result.success).toBe(false)
  })

  it('requires new password minimum 8 characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass',
      newPassword: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('accepts exactly 8 character new password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass',
      newPassword: '12345678',
    })
    expect(result.success).toBe(true)
  })

  it('rejects new password over 100 characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass',
      newPassword: 'x'.repeat(101),
    })
    expect(result.success).toBe(false)
  })
})
