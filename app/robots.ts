import type { MetadataRoute } from 'next'
import { isSiteLocked } from '@/lib/api/site-lock'

// Crawlers may index the marketing site; keep them out of the app, API, and
// auth/onboarding routes (private, and noise for search).
export default function robots(): MetadataRoute.Robots {
  // While the site is gated there is nothing for a crawler to see but the
  // password form, and a half-built product should not be accruing an index.
  if (isSiteLocked()) {
    return {
      rules: { userAgent: '*', disallow: '/' },
      host: 'https://velquor.app',
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/api/', '/dev', '/onboarding', '/auth/'],
    },
    sitemap: 'https://velquor.app/sitemap.xml',
    host: 'https://velquor.app',
  }
}
