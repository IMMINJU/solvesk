import { writeFile, mkdir } from 'fs/promises'
import fs from 'fs'
import path from 'path'
import { FILE_LIMITS } from '@/config/limits'
import { AppError, NotFoundError, ValidationError } from '@/lib/errors'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._]+/, '')
    .slice(0, 200)
}

export interface UploadResult {
  url: string
  name: string
  size: number
  type: string
}

class FileService {
  private getUploadDir(): string {
    return path.join(process.cwd(), 'uploads')
  }

  async upload(file: File): Promise<UploadResult> {
    if (file.size > FILE_LIMITS.maxFileSize) {
      throw new AppError('File too large (max 10MB)', 'VALIDATION_ERROR', 400)
    }

    if (
      !FILE_LIMITS.allowedMimeTypes.includes(
        file.type as (typeof FILE_LIMITS.allowedMimeTypes)[number]
      )
    ) {
      throw new AppError(`File type not allowed: ${file.type}`, 'VALIDATION_ERROR', 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const uploadDir = this.getUploadDir()
    await mkdir(uploadDir, { recursive: true })

    const sanitizedName = sanitizeFilename(file.name || 'file')
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 9)
    const ext = path.extname(sanitizedName) || '.bin'
    const filename = `${timestamp}-${randomSuffix}${ext}`
    const filepath = path.join(uploadDir, filename)

    await writeFile(filepath, buffer)

    return {
      url: `/api/uploads/${filename}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }
  }

  serve(filename: string): { buffer: Buffer; contentType: string; filename: string } {
    // Prevent path traversal
    const sanitized = path.basename(filename)
    if (sanitized !== filename || filename.includes('..')) {
      throw new AppError('Invalid filename', 'VALIDATION_ERROR', 400)
    }

    const filepath = path.join(this.getUploadDir(), sanitized)

    if (!fs.existsSync(filepath)) {
      throw new NotFoundError('File')
    }

    const buffer = fs.readFileSync(filepath)
    const ext = path.extname(sanitized).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    return { buffer, contentType, filename: sanitized }
  }
}

export const fileService = new FileService()
