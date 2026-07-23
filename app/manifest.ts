import type { MetadataRoute } from 'next'

// Makes VELQUOR installable (home-screen / standalone window) — the 192/512 logo
// assets were already staged for it.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Velquor',
    short_name: 'Velquor',
    description: 'MT5 trading analytics dashboard for serious traders.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/brand/vq-logo-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/vq-logo-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
