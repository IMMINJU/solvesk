import { describe, it, expect } from 'vitest'
import { createUserSchema, updateUserSchema } from '../user.service'

describe('createUserSchema', () => {
  it('accepts valid input', () => {
    const result = createUserSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'agent',
    })
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = createUserSchema.safeParse({
      name: '',
      email: 'john@example.com',
      password: 'password123',
      role: 'agent',
    })
    expect(result.success).toBe(false)
  })

  it('requires valid email', () => {
    const result = createUserSchema.safeParse({
      name: 'John',
      email: 'not-an-email',
      password: 'password123',
      role: 'agent',
    })
    expect(result.success).toBe(false)
  })

  it('requires password minimum 8 characters', () => {
    const result = createUserSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: 'short',
      role: 'agent',
    })
    expect(result.success).toBe(false)
  })

  it('accepts 8 character password', () => {
    const result = createUserSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: '12345678',
      role: 'agent',
    })
    expect(result.success).toBe(true)
  })

  it('rejects password over 100 characters', () => {
    const result = createUserSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: 'x'.repeat(101),
      role: 'agent',
    })
    expect(result.success).toBe(false)
  })

  it('only accepts valid roles', () => {
    const validRoles = ['admin', 'agent', 'customer']
    for (const role of validRoles) {
      const result = createUserSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
        password: 'password123',
        role,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid roles', () => {
    const result = createUserSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: 'password123',
      role: 'developer',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional projectId', () => {
    const result = createUserSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: 'password123',
      role: 'customer',
      projectId: 1,
    })
    expect(result.success).toBe(true)
  })

  it('accepts null projectId', () => {
    const result = createUserSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: 'password123',
      role: 'admin',
      projectId: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative projectId', () => {
    const result = createUserSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: 'password123',
      role: 'customer',
      projectId: -1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects name over 100 characters', () => {
    const result = createUserSchema.safeParse({
      name: 'x'.repeat(101),
      email: 'john@example.com',
      password: 'password123',
      role: 'agent',
    })
    expect(result.success).toBe(false)
  })

  it('rejects email over 255 characters', () => {
    const result = createUserSchema.safeParse({
      name: 'John',
      email: 'x'.repeat(247) + '@test.com',
      password: 'password123',
      role: 'agent',
    })
    expect(result.success).toBe(false)
  })
})

describe('updateUserSchema', () => {
  it('accepts partial update (name only)', () => {
    const result = updateUserSchema.safeParse({ name: 'Updated Name' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update (email only)', () => {
    const result = updateUserSchema.safeParse({ email: 'new@example.com' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update (role only)', () => {
    const result = updateUserSchema.safeParse({ role: 'admin' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateUserSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts null projectId', () => {
    const result = updateUserSchema.safeParse({ projectId: null })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = updateUserSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = updateUserSchema.safeParse({ email: 'not-email' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid role', () => {
    const result = updateUserSchema.safeParse({ role: 'superadmin' })
    expect(result.success).toBe(false)
  })

  it('accepts full update', () => {
    const result = updateUserSchema.safeParse({
      name: 'Updated',
      email: 'updated@example.com',
      role: 'customer',
      projectId: 5,
    })
    expect(result.success).toBe(true)
  })
})
