import { APP_CONFIG } from '@/config/app'

/**
 * Builds a deterministic pseudonym map for staff users.
 *
 * Given a list of staff user IDs, sorts them alphabetically and
 * assigns sequential numbers. The same user ID always gets the
 * same pseudonym within the same set of IDs.
 *
 * @returns Map<userId, pseudonymName> (e.g. "Support Agent 1")
 */
export function buildPseudonymMap(staffUserIds: string[]): Map<string, string> {
  const sorted = [...new Set(staffUserIds)].sort()
  const map = new Map<string, string>()
  const format = APP_CONFIG.pseudonym.format

  sorted.forEach((id, index) => {
    map.set(id, format.replace('{n}', String(index + 1)))
  })

  return map
}

interface UserFields {
  id: string
  name: string | null
  email?: string | null
  image: string | null
}

/**
 * Apply pseudonyms to a user object for customer-facing responses.
 * Replaces name with pseudonym and strips email/image.
 */
export function applyPseudonym<T extends UserFields>(
  user: T,
  pseudonymMap: Map<string, string>
): T {
  const pseudonym = pseudonymMap.get(user.id)
  if (!pseudonym) return user

  return {
    ...user,
    name: pseudonym,
    email: undefined,
    image: null,
  }
}

/**
 * Collect all unique staff user IDs from an issue response.
 * Includes reporter, assignee, and comment authors.
 */
export function collectStaffIds(
  issue: {
    reporter?: { id: string; role?: string } | null
    assignee?: { id: string; role?: string } | null
    comments?: Array<{ author?: { id: string; role?: string } | null }>
  },
  staffRoles: string[] = ['admin', 'agent']
): string[] {
  const ids = new Set<string>()

  if (issue.reporter && staffRoles.includes(issue.reporter.role ?? '')) {
    ids.add(issue.reporter.id)
  }
  if (issue.assignee && staffRoles.includes(issue.assignee.role ?? '')) {
    ids.add(issue.assignee.id)
  }
  if (issue.comments) {
    for (const comment of issue.comments) {
      if (comment.author && staffRoles.includes(comment.author.role ?? '')) {
        ids.add(comment.author.id)
      }
    }
  }

  return [...ids]
}
