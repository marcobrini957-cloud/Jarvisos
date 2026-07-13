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
};

export default nextConfig;
