import type { NextConfig } from "next";
import packageJson from './package.json';

const nextConfig: NextConfig = {
  env: {
    APP_VERSION: packageJson.version,
  },
  // Add security headers for proper permissions handling
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            // Allow microphone and camera for voice sessions
            key: 'Permissions-Policy',
            value: 'microphone=(self), camera=(self), display-capture=(self)',
          },
          {
            // CORS for API routes - restrict to same origin in production
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
