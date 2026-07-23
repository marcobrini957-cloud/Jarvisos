import type { MetadataRoute } from 'next'

// Crawlers may index the marketing site; keep them out of the app, API, and
// auth/onboarding routes (private, and noise for search).
export default function robots(): MetadataRoute.Robots {
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
