import { describe, it, expect } from 'vitest'
import { createProjectSchema, updateProjectSchema } from '../project.service'

describe('createProjectSchema', () => {
  it('accepts valid input', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test Project',
      code: 'PROJ',
      description: 'A test project',
    })
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = createProjectSchema.safeParse({
      name: '',
      code: 'PROJ',
    })
    expect(result.success).toBe(false)
  })

  it('requires code to start with uppercase letter', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      code: '1PROJ',
    })
    expect(result.success).toBe(false)
  })

  it('rejects lowercase code', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      code: 'proj',
    })
    expect(result.success).toBe(false)
  })

  it('accepts code with numbers and underscores', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      code: 'PROJ_01',
    })
    expect(result.success).toBe(true)
  })

  it('rejects code longer than 10 chars', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      code: 'ABCDEFGHIJK',
    })
    expect(result.success).toBe(false)
  })

  it('rejects code shorter than 2 chars', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      code: 'A',
    })
    expect(result.success).toBe(false)
  })

  it('description is optional', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      code: 'AB',
    })
    expect(result.success).toBe(true)
  })

  it('rejects description over 1000 chars', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      code: 'AB',
      description: 'x'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})

describe('updateProjectSchema', () => {
  it('accepts partial update', () => {
    const result = updateProjectSchema.safeParse({ name: 'Updated' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateProjectSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts null description', () => {
    const result = updateProjectSchema.safeParse({ description: null })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = updateProjectSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })
})
