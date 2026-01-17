import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // Creates .next/standalone with minimal server.js for production
  output: "standalone",
  env: {
    APP_VERSION: packageJson.version,
  },
  // C-18 FIX: External packages that should not be bundled by Next.js
  // pdf-parse uses pdfjs-dist which has native dependencies
  serverExternalPackages: ["pdf-parse"],

  // Bundle optimization: Tree-shake large packages
  // Reduces bundle size by only importing used components
  experimental: {
    optimizePackageImports: [
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
      "lucide-react",
      "framer-motion",
      "date-fns",
    ],
  },

  // Image optimization settings
  images: {
    // Enable modern formats for smaller sizes
    formats: ["image/avif", "image/webp"],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Image sizes for fixed-size images
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Minimize browser memory usage
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
  },
  // Add security headers for proper permissions handling
  async headers() {
    const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:3000";

    return [
      {
        // Global security headers for all routes
        source: "/:path*",
        headers: [
          {
            // Allow microphone and camera for voice sessions
            key: "Permissions-Policy",
            value: "microphone=(self), camera=(self), display-capture=(self)",
          },
          {
            // Prevent clickjacking
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            // Prevent MIME type sniffing
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // XSS protection
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Content-Security-Policy moved to src/middleware.ts (nonce-based)
          // See F-03: CSP middleware for XSS protection
        ],
      },
      {
        // CORS headers for API routes only
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: allowedOrigin,
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400", // 24 hours preflight cache
          },
        ],
      },
    ];
  },
};

export default nextConfig;
