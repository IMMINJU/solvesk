import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { apiRateLimiter } from '@/lib/rate-limit'
import { fileService } from '@/lib/services/file.service'
import { AppError } from '@/lib/errors'

export const POST = withAuth({ rateLimit: apiRateLimiter }, async (_user, request) => {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    throw new AppError('No file provided', 'VALIDATION_ERROR', 400)
  }

  const result = await fileService.upload(file)
  return NextResponse.json(result)
})
