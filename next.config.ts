import type { NextConfig } from "next";
import packageJson from './package.json';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // Creates .next/standalone with minimal server.js for production
  output: 'standalone',
  env: {
    APP_VERSION: packageJson.version,
  },
  // C-18 FIX: External packages that should not be bundled by Next.js
  // pdf-parse uses pdfjs-dist which has native dependencies
  serverExternalPackages: ['pdf-parse'],
  // Add security headers for proper permissions handling
  async headers() {
    const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';

    return [
      {
        // Global security headers for all routes
        source: '/:path*',
        headers: [
          {
            // Allow microphone and camera for voice sessions
            key: 'Permissions-Policy',
            value: 'microphone=(self), camera=(self), display-capture=(self)',
          },
          {
            // Prevent clickjacking
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            // Prevent MIME type sniffing
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // XSS protection
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            // Content Security Policy - Defense against XSS, clickjacking, code injection
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net cdnjs.cloudflare.com",
              "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net cdnjs.cloudflare.com fonts.cdnfonts.com",
              "font-src 'self' data: cdn.jsdelivr.net cdnjs.cloudflare.com fonts.cdnfonts.com",
              "img-src 'self' data: blob: https:",
              "media-src 'self' data: blob:",
              "connect-src 'self' https://*.openai.azure.com wss://*.openai.azure.com http://localhost:11434",
              "worker-src 'self' blob:",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
      {
        // CORS headers for API routes only
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: allowedOrigin,
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400', // 24 hours preflight cache
          },
        ],
      },
    ];
  },
};

export default nextConfig;
