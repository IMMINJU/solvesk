import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export default intlMiddleware

export const config = {
  matcher: [
    // Match all pathnames except:
    // - API routes (/api/...)
    // - Next.js internals (_next/...)
    // - Static files (favicon, images, etc.)
    '/((?!api|_next|icon|apple-icon|opengraph-image|.*\\..*).*)',
  ],
}
