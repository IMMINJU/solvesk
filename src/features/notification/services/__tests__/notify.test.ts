import { describe, it, expect } from 'vitest'
import { buildNotificationMessage } from '../notify'

describe('buildNotificationMessage', () => {
  it('builds issue_created message', () => {
    const msg = buildNotificationMessage('issue_created', 'ACME-1', 'Alice')
    expect(msg).toBe('Alice created ACME-1')
  })

  it('builds issue_assigned message', () => {
    const msg = buildNotificationMessage('issue_assigned', 'ACME-2', 'Bob')
    expect(msg).toBe('Bob assigned you to ACME-2')
  })

  it('builds issue_status_changed message', () => {
    const msg = buildNotificationMessage('issue_status_changed', 'GLX-1', 'Charlie')
    expect(msg).toBe('Charlie changed the status of GLX-1')
  })

  it('builds issue_priority_changed message', () => {
    const msg = buildNotificationMessage('issue_priority_changed', 'ACME-3', 'Dave')
    expect(msg).toBe('Dave changed the priority of ACME-3')
  })

  it('builds comment_added message', () => {
    const msg = buildNotificationMessage('comment_added', 'ACME-1', 'Eve')
    expect(msg).toBe('Eve commented on ACME-1')
  })

  it('builds issue_mentioned message', () => {
    const msg = buildNotificationMessage('issue_mentioned', 'GLX-2', 'Frank')
    expect(msg).toBe('Frank mentioned you in GLX-2')
  })
})
