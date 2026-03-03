export const APP_CONFIG = {
  name: 'Solvesk',
  description: 'Open-source multi-tenant helpdesk & issue tracker',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  email: {
    from: process.env.EMAIL_FROM || 'noreply@solvesk.com',
    replyTo: process.env.EMAIL_REPLY_TO || 'support@solvesk.com',
  },
  locale: {
    default: 'en' as const,
    supported: ['en', 'ko'] as const,
  },
  /**
   * Pseudonym settings for customer-facing responses.
   * When enabled, staff (admin/agent) names and emails are replaced
   * with anonymous labels like "Support Agent 1" for customer users.
   */
  pseudonym: {
    enabled: true,
    /** Format string — {n} is replaced with the agent number */
    format: 'Support Agent {n}',
  },
} as const
