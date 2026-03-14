import { NextResponse } from 'next/server'
import { seedDatabase } from '@/scripts/seed-data'

export const maxDuration = 30

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await seedDatabase()
    return NextResponse.json({ success: true, resetAt: new Date().toISOString() })
  } catch (error) {
    console.error('Cron reset failed:', error)
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
}
