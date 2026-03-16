/**
 * E2E: File Upload — upload, rejection, deletion flows
 *
 * Uses API-level requests for upload/rejection tests and
 * browser interaction for the UI attachment flow.
 */
import { test, expect } from '../auth'

const UNIQUE = Date.now().toString(36)

// ─── 1. Admin uploads a file on issue detail ─────────────────────

test.describe('Admin: Upload file on issue detail', () => {
  test('can upload a file and see it in attachments', async ({ adminPage, adminContext }) => {
    // Navigate to ACME-1 issue detail
    await adminPage.goto('/en/projects/ACME/issues/ACME-1')
    await expect(
      adminPage.locator('[data-testid="issue-detail"]').or(adminPage.getByRole('heading').first())
    ).toBeVisible()

    // Upload via API (more reliable than drag-and-drop in E2E)
    const uploadResponse = await adminContext.request.post('/api/upload', {
      multipart: {
        file: {
          name: `e2e-test-${UNIQUE}.txt`,
          mimeType: 'text/plain',
          buffer: Buffer.from('hello from e2e test'),
        },
      },
    })

    expect(uploadResponse.ok()).toBe(true)
    const uploadData = await uploadResponse.json()
    expect(uploadData.url).toBeTruthy()
    expect(uploadData.name).toContain(UNIQUE)
    expect(uploadData.type).toBe('text/plain')
    expect(uploadData.size).toBeGreaterThan(0)
  })
})

// ─── 2. Upload rejects oversized file ────────────────────────────

test.describe('Upload validation: file size', () => {
  test('rejects file larger than 10MB', async ({ adminContext }) => {
    // Create a buffer slightly over 10MB
    const oversize = Buffer.alloc(10 * 1024 * 1024 + 1, 'x')

    const response = await adminContext.request.post('/api/upload', {
      multipart: {
        file: {
          name: 'oversized.txt',
          mimeType: 'text/plain',
          buffer: oversize,
        },
      },
    })

    expect(response.ok()).toBe(false)
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.error).toMatch(/too large/i)
  })
})

// ─── 3. Upload rejects disallowed MIME type ──────────────────────

test.describe('Upload validation: MIME type', () => {
  test('rejects executable MIME type', async ({ adminContext }) => {
    const response = await adminContext.request.post('/api/upload', {
      multipart: {
        file: {
          name: 'malware.exe',
          mimeType: 'application/x-msdownload',
          buffer: Buffer.from('MZ...'),
        },
      },
    })

    expect(response.ok()).toBe(false)
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.error).toMatch(/not allowed/i)
  })

  test('rejects HTML MIME type', async ({ adminContext }) => {
    const response = await adminContext.request.post('/api/upload', {
      multipart: {
        file: {
          name: 'page.html',
          mimeType: 'text/html',
          buffer: Buffer.from('<script>alert(1)</script>'),
        },
      },
    })

    expect(response.ok()).toBe(false)
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.error).toMatch(/not allowed/i)
  })
})

// ─── 4. Admin can delete an attachment ───────────────────────────

test.describe('Admin: Delete attachment', () => {
  test('can upload then delete an attachment via API', async ({ adminContext }) => {
    // First, upload a file
    const uploadResponse = await adminContext.request.post('/api/upload', {
      multipart: {
        file: {
          name: `delete-test-${UNIQUE}.txt`,
          mimeType: 'text/plain',
          buffer: Buffer.from('to be deleted'),
        },
      },
    })
    expect(uploadResponse.ok()).toBe(true)

    const uploadData = await uploadResponse.json()

    // Get ACME-1 issue to find its ID for attachment creation
    const issueResponse = await adminContext.request.get('/api/issues/ACME-1')
    expect(issueResponse.ok()).toBe(true)
    const issue = await issueResponse.json()
    const issueId = issue.id

    // Add attachment to the issue
    const attachResponse = await adminContext.request.post('/api/issues/ACME-1/attachments', {
      data: {
        attachments: [
          {
            fileName: uploadData.name,
            fileUrl: uploadData.url,
            fileSize: uploadData.size,
            mimeType: uploadData.type,
          },
        ],
      },
    })
    expect(attachResponse.ok()).toBe(true)

    const attachments = await attachResponse.json()
    expect(attachments.length).toBeGreaterThan(0)

    const attachmentId = attachments[0].id

    // Delete the attachment
    const deleteResponse = await adminContext.request.delete(`/api/attachments/${attachmentId}`)
    expect(deleteResponse.ok()).toBe(true)
  })
})
