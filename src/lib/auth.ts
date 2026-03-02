import { getServerSession } from 'next-auth'
import { authOptions } from './auth-options'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'

export { authOptions }

/**
 * Get current NextAuth session
 */
export async function getSession() {
  return getServerSession(authOptions)
}

/**
 * Get current authenticated user with project relation
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const session = await getSession()
  if (!session?.user?.id) return null

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    with: {
      project: true,
    },
  })

  return user ?? null
}
