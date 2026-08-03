import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer is server-only (used in /api/reports) — keep it out of bundles
  serverExternalPackages: ['@react-pdf/renderer'],
  // The report is set in the site's own faces, which @react-pdf loads from disk
  // at render time. Nothing imports the .ttf files, so tracing cannot see them
  // and the serverless function would ship without them — the failure mode is
  // silent: fonts fall back to Helvetica and the PDF still renders, so it looks
  // fine locally and wrong in production.
  outputFileTracingIncludes: {
    '/api/reports': ['./lib/pdf/fonts/**'],
  },
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
  // The landing preview URL was passed around for a couple of days before the
  // design went live at /. Done here rather than with redirect() in a page:
  // that renders an HTML shell and redirects on the client, which is a 200 to
  // a crawler. This is a real 308 at the routing layer.
  async redirects() {
    return [
      { source: '/preview/landing', destination: '/', permanent: true },
    ]
  },
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
