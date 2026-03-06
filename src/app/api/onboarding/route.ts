import { NextResponse } from 'next/server'
import { userService, onboardingSchema } from '@/features/user/services/user.service'
import { handleApiError } from '@/lib/error-handler'

/** GET /api/onboarding — check if onboarding is needed */
export async function GET() {
  const needsOnboarding = await userService.needsOnboarding()
  return NextResponse.json({ needsOnboarding })
}

/** POST /api/onboarding — create first admin user */
export async function POST(request: Request) {
  try {
    const body = onboardingSchema.parse(await request.json())
    const admin = await userService.createFirstAdmin(body)
    return NextResponse.json({ success: true, user: admin })
  } catch (error) {
    return handleApiError(error)
  }
}
