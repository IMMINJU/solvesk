/**
 * Server-side permissions utilities
 * For API routes and server components only
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

import {
  PERMISSIONS,
  hasPermission as hasPermissionConfig,
  canAccessResource,
  CUSTOMER_CONSTRAINTS,
  canCustomerChangeStatus,
  type UserRole,
  type Resource,
  type ValidAction,
} from './permissions-config'

export {
  PERMISSIONS,
  hasPermissionConfig as hasPermission,
  canAccessResource,
  CUSTOMER_CONSTRAINTS,
  canCustomerChangeStatus,
  type UserRole,
  type Resource,
  type ValidAction,
}

export interface AuthenticatedUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  projectId: number | null
  image: string | null
}

type AuthResult = { user: AuthenticatedUser; error?: never } | { user?: never; error: NextResponse }

/**
 * Require authentication
 */
export async function requireAuth(): Promise<AuthResult> {
  const user = await getCurrentUser()
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { user: user as AuthenticatedUser }
}

/**
 * Require specific permission
 */
export async function requirePermission<R extends Resource>(
  resource: R,
  action: ValidAction<R>
): Promise<AuthResult> {
  const authResult = await requireAuth()
  if (authResult.error) return authResult

  const { user } = authResult
  if (!hasPermissionConfig(user.role, resource, action)) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { user }
}

/**
 * Require specific role(s)
 */
export async function requireRole(...roles: UserRole[]): Promise<AuthResult> {
  const authResult = await requireAuth()
  if (authResult.error) return authResult

  const { user } = authResult
  if (!roles.includes(user.role)) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { user }
}

export const requireAdmin = () => requireRole('admin')
export const requireStaff = () => requireRole('admin', 'agent')

/**
 * Require project access
 * - Admin: all projects
 * - Agent: assigned projects (project_members)
 * - Customer: own project only (users.projectId)
 */
export async function requireProjectAccess(projectId: number): Promise<AuthResult> {
  const authResult = await requireAuth()
  if (authResult.error) return authResult

  const { user } = authResult

  if (user.role === 'admin') return { user }

  if (user.role === 'customer') {
    if (user.projectId !== projectId) {
      return {
        error: NextResponse.json(
          { error: 'Forbidden: No access to this project' },
          { status: 403 }
        ),
      }
    }
    return { user }
  }

  // Agent: check project_members
  const { db, projectMembers } = await import('@/db')
  const { and, eq } = await import('drizzle-orm')

  const membership = await db.query.projectMembers.findFirst({
    where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)),
  })

  if (!membership) {
    return {
      error: NextResponse.json({ error: 'Forbidden: No access to this project' }, { status: 403 }),
    }
  }

  return { user }
}
