import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://*.supabase.co",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://api.geoapify.com https://maps.geoapify.com https://*.geoapify.com",
              "font-src 'self' data: https://maps.geoapify.com https://*.geoapify.com",
              "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org https://api.geoapify.com https://maps.geoapify.com https://*.geoapify.com https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://demotiles.maplibre.org",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/admin/analytics",
        destination: "/admin/financials?tab=overview",
        permanent: true,
      },
      {
        source: "/admin/admin_revenue",
        destination: "/admin/financials?tab=revenue",
        permanent: true,
      },
      {
        source: "/admin/expenses",
        destination: "/admin/financials?tab=expenses",
        permanent: true,
      },
      {
        source: "/admin/income",
        destination: "/admin/financials?tab=income",
        permanent: true,
      },
      {
        source: "/admin/staff_manager",
        destination: "/admin/staff",
        permanent: true,
      },
      {
        source: "/cars",
        destination: "/user/cars",
        permanent: true,
      },
    ];
  },
  experimental: {
    agentUpgrade: "security",
    agentFeedback: true,
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
