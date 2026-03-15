import { describe, it, expect } from 'vitest'
import en from '../../../messages/en.json'
import ko from '../../../messages/ko.json'

describe('i18n message files', () => {
  it('en and ko have the same top-level namespaces', () => {
    const enKeys = Object.keys(en).sort()
    const koKeys = Object.keys(ko).sort()
    expect(enKeys).toEqual(koKeys)
  })

  it('every namespace has matching keys', () => {
    const namespaces = Object.keys(en) as (keyof typeof en)[]

    for (const ns of namespaces) {
      const enKeys = Object.keys(en[ns]).sort()
      const koKeys = Object.keys(ko[ns as keyof typeof ko]).sort()
      expect(enKeys, `Namespace "${ns}" keys mismatch`).toEqual(koKeys)
    }
  })

  it('no empty values in en.json', () => {
    for (const [ns, messages] of Object.entries(en)) {
      for (const [key, value] of Object.entries(messages)) {
        expect(value, `en.${ns}.${key} is empty`).not.toBe('')
      }
    }
  })

  it('no empty values in ko.json', () => {
    for (const [ns, messages] of Object.entries(ko)) {
      for (const [key, value] of Object.entries(messages)) {
        expect(value, `ko.${ns}.${key} is empty`).not.toBe('')
      }
    }
  })

  it('has required namespaces', () => {
    const required = [
      'common',
      'auth',
      'nav',
      'dashboard',
      'issues',
      'status',
      'priority',
      'comments',
      'projects',
      'users',
      'notifications',
      'settings',
      'labels',
      'errors',
    ]
    for (const ns of required) {
      expect(en).toHaveProperty(ns)
      expect(ko).toHaveProperty(ns)
    }
  })
})

describe('i18n routing config', () => {
  it('exports routing with en and ko locales', async () => {
    const { routing } = await import('../routing')
    expect(routing.locales).toContain('en')
    expect(routing.locales).toContain('ko')
    expect(routing.defaultLocale).toBe('en')
  })
})
