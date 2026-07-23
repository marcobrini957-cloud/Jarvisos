import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer is server-only (used in /api/reports) — keep it out of bundles
  serverExternalPackages: ['@react-pdf/renderer'],
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lgkdbfrsmgcxjfmvnvnd.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Baseline security headers. Deliberately conservative — no Permissions-Policy
  // (would risk the mic used for voice dictation) and HSTS without includeSubDomains
  // (so the bridge/other subdomains are never forced). SAMEORIGIN, not DENY, since
  // Google One Tap / GIS embed their own frames into our pages.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        ],
      },
    ]
  },
};

export default nextConfig;
