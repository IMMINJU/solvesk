import { describe, it, expect } from 'vitest'
import { buildPseudonymMap, applyPseudonym, collectStaffIds } from '../pseudonym'

describe('buildPseudonymMap', () => {
  it('assigns sequential numbers sorted alphabetically', () => {
    const map = buildPseudonymMap(['zzz', 'aaa', 'mmm'])
    expect(map.get('aaa')).toBe('Support Agent 1')
    expect(map.get('mmm')).toBe('Support Agent 2')
    expect(map.get('zzz')).toBe('Support Agent 3')
  })

  it('is deterministic — same input always same output', () => {
    const map1 = buildPseudonymMap(['b', 'a', 'c'])
    const map2 = buildPseudonymMap(['c', 'a', 'b'])
    expect(map1.get('a')).toBe(map2.get('a'))
    expect(map1.get('b')).toBe(map2.get('b'))
    expect(map1.get('c')).toBe(map2.get('c'))
  })

  it('deduplicates IDs', () => {
    const map = buildPseudonymMap(['a', 'a', 'b'])
    expect(map.size).toBe(2)
  })

  it('returns empty map for empty input', () => {
    const map = buildPseudonymMap([])
    expect(map.size).toBe(0)
  })

  it('handles single ID', () => {
    const map = buildPseudonymMap(['only'])
    expect(map.get('only')).toBe('Support Agent 1')
  })
})

describe('applyPseudonym', () => {
  const map = buildPseudonymMap(['agent-1', 'agent-2'])

  it('replaces name, strips email and image', () => {
    const user = {
      id: 'agent-1',
      name: 'John Doe',
      email: 'john@company.com',
      image: 'https://avatar.com/john.jpg',
    }
    const result = applyPseudonym(user, map)
    expect(result.name).toBe('Support Agent 1')
    expect(result.email).toBeUndefined()
    expect(result.image).toBeNull()
  })

  it('returns user unchanged if not in map', () => {
    const user = {
      id: 'customer-1',
      name: 'Customer',
      email: 'cust@test.com',
      image: null,
    }
    const result = applyPseudonym(user, map)
    expect(result.name).toBe('Customer')
    expect(result.email).toBe('cust@test.com')
  })

  it('preserves id field', () => {
    const user = { id: 'agent-2', name: 'Jane', email: 'j@c.com', image: null }
    const result = applyPseudonym(user, map)
    expect(result.id).toBe('agent-2')
    expect(result.name).toBe('Support Agent 2')
  })
})

describe('collectStaffIds', () => {
  it('collects IDs from reporter, assignee, and comment authors', () => {
    const issue = {
      reporter: { id: 'agent-1', role: 'agent' },
      assignee: { id: 'admin-1', role: 'admin' },
      comments: [
        { author: { id: 'agent-2', role: 'agent' } },
        { author: { id: 'customer-1', role: 'customer' } },
      ],
    }
    const ids = collectStaffIds(issue)
    expect(ids).toContain('agent-1')
    expect(ids).toContain('admin-1')
    expect(ids).toContain('agent-2')
    expect(ids).not.toContain('customer-1')
  })

  it('skips null reporter/assignee', () => {
    const issue = {
      reporter: null,
      assignee: null,
      comments: [],
    }
    expect(collectStaffIds(issue)).toEqual([])
  })

  it('deduplicates', () => {
    const issue = {
      reporter: { id: 'agent-1', role: 'agent' },
      assignee: { id: 'agent-1', role: 'agent' },
      comments: [{ author: { id: 'agent-1', role: 'agent' } }],
    }
    expect(collectStaffIds(issue)).toEqual(['agent-1'])
  })

  it('handles missing comments', () => {
    const issue = {
      reporter: { id: 'agent-1', role: 'agent' },
    }
    expect(collectStaffIds(issue)).toEqual(['agent-1'])
  })
})
