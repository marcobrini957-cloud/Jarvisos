import type { MetadataRoute } from 'next'

// Public marketing + legal pages only (app/auth/api routes stay out of search).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://velquor.app'
  const now = new Date()
  const routes = ['', '/pricing', '/impressum', '/privacy', '/terms', '/datenschutz', '/agb']
  return routes.map(path => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.5,
  }))
}
