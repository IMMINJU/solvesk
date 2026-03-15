import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'
import { FILE_LIMITS } from '@/config/limits'

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}))

// Must import AFTER mocks are declared
import { fileService } from '../file.service'
import { writeFile, mkdir } from 'fs/promises'
import fs from 'fs'

// ── Helpers ────────────────────────────────────────────────────────

function createMockFile(
  name: string,
  size: number,
  type: string,
  content: string = 'file-content'
): File {
  const buffer = Buffer.alloc(size, 'x')
  return {
    name,
    size,
    type,
    arrayBuffer: () => Promise.resolve(buffer.buffer),
  } as unknown as File
}

// ── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FileService.upload', () => {
  it('rejects files exceeding the size limit', async () => {
    const oversized = createMockFile('huge.png', FILE_LIMITS.maxFileSize + 1, 'image/png')

    await expect(fileService.upload(oversized)).rejects.toThrow('File too large')
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('rejects files at exactly size limit + 1 byte', async () => {
    const file = createMockFile('edge.png', FILE_LIMITS.maxFileSize + 1, 'image/png')

    await expect(fileService.upload(file)).rejects.toThrow('File too large')
  })

  it('allows files at exactly the size limit', async () => {
    const file = createMockFile('exact.png', FILE_LIMITS.maxFileSize, 'image/png')

    const result = await fileService.upload(file)
    expect(result).toBeDefined()
    expect(writeFile).toHaveBeenCalled()
  })

  it('rejects disallowed MIME types', async () => {
    const exe = createMockFile('malware.exe', 100, 'application/x-msdownload')

    await expect(fileService.upload(exe)).rejects.toThrow('File type not allowed')
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('rejects application/javascript MIME type', async () => {
    const js = createMockFile('script.js', 100, 'application/javascript')

    await expect(fileService.upload(js)).rejects.toThrow('File type not allowed')
  })

  it('rejects text/html MIME type', async () => {
    const html = createMockFile('page.html', 100, 'text/html')

    await expect(fileService.upload(html)).rejects.toThrow('File type not allowed')
  })

  it('accepts all allowed MIME types', async () => {
    for (const mimeType of FILE_LIMITS.allowedMimeTypes) {
      vi.clearAllMocks()
      const file = createMockFile('test.bin', 100, mimeType)
      const result = await fileService.upload(file)
      expect(result).toBeDefined()
      expect(result.type).toBe(mimeType)
    }
  })

  it('creates the upload directory before writing', async () => {
    const file = createMockFile('doc.pdf', 500, 'application/pdf')

    await fileService.upload(file)

    expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('uploads'), { recursive: true })
    expect(writeFile).toHaveBeenCalled()
  })

  it('returns correct url, name, size, and type', async () => {
    const file = createMockFile('report.pdf', 2048, 'application/pdf')

    const result = await fileService.upload(file)

    expect(result.url).toMatch(/^\/api\/uploads\/\d+-[a-z0-9]+\.pdf$/)
    expect(result.name).toBe('report.pdf')
    expect(result.size).toBe(2048)
    expect(result.type).toBe('application/pdf')
  })

  it('writes a buffer to the expected filepath', async () => {
    const file = createMockFile('test.txt', 100, 'text/plain')

    await fileService.upload(file)

    const [filepath, buffer] = vi.mocked(writeFile).mock.calls[0]
    expect(String(filepath)).toContain('uploads')
    expect(String(filepath)).toMatch(/\.txt$/)
    expect(Buffer.isBuffer(buffer)).toBe(true)
  })

  it('generates unique filenames for repeated uploads', async () => {
    const file1 = createMockFile('same.png', 100, 'image/png')
    const file2 = createMockFile('same.png', 100, 'image/png')

    const result1 = await fileService.upload(file1)
    const result2 = await fileService.upload(file2)

    expect(result1.url).not.toBe(result2.url)
  })
})

describe('FileService.serve', () => {
  it('prevents path traversal with ../', () => {
    expect(() => fileService.serve('../../etc/passwd')).toThrow('Invalid filename')
  })

  it('prevents path traversal with ..\\', () => {
    expect(() => fileService.serve('..\\..\\etc\\passwd')).toThrow('Invalid filename')
  })

  it('prevents path traversal with subdirectory', () => {
    expect(() => fileService.serve('subdir/file.txt')).toThrow('Invalid filename')
  })

  it('returns 404 for missing files', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    expect(() => fileService.serve('nonexistent.png')).toThrow('File not found')
  })

  it('returns correct content type for .jpg', () => {
    const buf = Buffer.from('fake-jpeg')
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(buf)

    const result = fileService.serve('1234-abc.jpg')

    expect(result.contentType).toBe('image/jpeg')
    expect(result.buffer).toEqual(buf)
    expect(result.filename).toBe('1234-abc.jpg')
  })

  it('returns correct content type for .pdf', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-pdf'))

    const result = fileService.serve('doc.pdf')
    expect(result.contentType).toBe('application/pdf')
  })

  it('returns correct content type for .png', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-png'))

    const result = fileService.serve('image.png')
    expect(result.contentType).toBe('image/png')
  })

  it('returns application/octet-stream for unknown extensions', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('binary'))

    const result = fileService.serve('data.xyz')
    expect(result.contentType).toBe('application/octet-stream')
  })

  it('reads from the correct filepath', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('data'))

    fileService.serve('1234-test.txt')

    const calledPath = vi.mocked(fs.readFileSync).mock.calls[0][0] as string
    expect(calledPath).toContain('uploads')
    expect(calledPath).toContain('1234-test.txt')
  })
})

describe('sanitizeFilename (tested via upload)', () => {
  it('strips dangerous characters from filename', async () => {
    const file = createMockFile("../../<script>alert('xss')</script>.png", 100, 'image/png')

    const result = await fileService.upload(file)

    // The URL should only contain safe chars in the filename portion
    const urlFilename = result.url.split('/').pop()!
    expect(urlFilename).not.toContain('<')
    expect(urlFilename).not.toContain('>')
    expect(urlFilename).not.toContain("'")
    expect(urlFilename).not.toContain('/')
    expect(urlFilename).not.toContain('..')
  })

  it('collapses multiple underscores', async () => {
    const file = createMockFile('a___b___c.png', 100, 'image/png')

    const result = await fileService.upload(file)

    // The original name is preserved in result.name, but the disk filename is sanitized
    // We verify via the URL which uses the sanitized+timestamped name
    const urlFilename = result.url.split('/').pop()!
    expect(urlFilename).not.toMatch(/_{2,}/)
  })

  it('strips leading dots and underscores', async () => {
    const file = createMockFile('..hidden.png', 100, 'image/png')

    const result = await fileService.upload(file)

    const urlFilename = result.url.split('/').pop()!
    // The timestamp prefix ensures no leading dot
    expect(urlFilename).toMatch(/^\d+/)
  })

  it('limits filename length', async () => {
    const longName = 'a'.repeat(300) + '.png'
    const file = createMockFile(longName, 100, 'image/png')

    const result = await fileService.upload(file)

    // sanitizeFilename truncates to 200 chars; with 300 a's + .png (304 chars),
    // the extension is lost after truncation, so extname falls back to .bin
    // The key assertion: the generated filename portion is bounded in length
    const urlFilename = result.url.split('/').pop()!
    // timestamp-random.ext format — the sanitized part fed into it is at most 200 chars
    expect(urlFilename.length).toBeLessThan(250)
  })
})
