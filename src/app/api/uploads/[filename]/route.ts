import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { fileService } from '@/lib/services/file.service'

export const GET = withAuth<{ filename: string }>(async (_user, _request, { filename }) => {
  const file = fileService.serve(filename)

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `inline; filename="${file.filename}"`,
      'Cache-Control': 'private, max-age=86400',
    },
  })
})
