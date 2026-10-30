import type { NextConfig } from "next";

const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';
const isDockerBuild = process.env.DOCKER_BUILD === 'true';

const nextConfig: NextConfig = {
  // If building for Capacitor native mobile export
  ...(isCapacitorBuild
    ? {
        output: 'export',
        images: { unoptimized: true },
      }
    : {
        ...(isDockerBuild ? { output: 'standalone' as const } : {}),
        async rewrites() {
          const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:4000';
          return [
            {
              source: '/api/v1/:path*',
              destination: `${backendUrl}/api/v1/:path*`,
            },
            {
              source: '/uploads/:path*',
              destination: `${backendUrl}/uploads/:path*`,
            },
          ];
        },
      }),
  cacheComponents: !isCapacitorBuild,
  partialPrefetching: !isCapacitorBuild,
  devIndicators: false,
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

