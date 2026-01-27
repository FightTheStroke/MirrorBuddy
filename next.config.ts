import type { NextConfig } from "next";
import packageJson from "./package.json";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

// Bundle analyzer configuration (enabled via ANALYZE=true)
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Next-intl plugin for internationalization
// Points to the i18n request config file
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // Creates .next/standalone with minimal server.js for production
  output: "standalone",
  env: {
    APP_VERSION: packageJson.version,
  },
  // Enable source maps in production - serve them publicly
  // This eliminates 404 errors for .js.map files
  // Security note: source maps expose code structure but MirrorBuddy is open-source anyway
  productionBrowserSourceMaps: true,
  // Note: pdf-parse was previously in serverExternalPackages, but this caused
  // runtime failures on Vercel serverless because the package wasn't available.
  // Now bundled with the app for proper Vercel deployment.

  // Bundle optimization: Tree-shake large packages
  // Reduces bundle size by only importing used components
  experimental: {
    // Increase body size limit for file uploads (study kit PDFs up to 20MB)
    serverActions: {
      bodySizeLimit: "20mb",
    },
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
  // Rewrite localized static files to their root locations
  // Fix: i18n middleware redirects /manifest.json to /it/manifest.json which doesn't exist
  // This rewrite serves the root manifest.json for all localized paths
  async rewrites() {
    return [
      // Manifest.json - serve from root for all locales
      {
        source: "/:locale(it|en|fr|de|es)/manifest.json",
        destination: "/manifest.json",
      },
      // Favicons - serve from root for all locales
      {
        source: "/:locale(it|en|fr|de|es)/favicon-16.png",
        destination: "/favicon-16.png",
      },
      {
        source: "/:locale(it|en|fr|de|es)/favicon-32.png",
        destination: "/favicon-32.png",
      },
      {
        source: "/:locale(it|en|fr|de|es)/favicon-48.png",
        destination: "/favicon-48.png",
      },
      // Icons - serve from root for all locales
      {
        source: "/:locale(it|en|fr|de|es)/icon-192.png",
        destination: "/icon-192.png",
      },
      {
        source: "/:locale(it|en|fr|de|es)/icon-512.png",
        destination: "/icon-512.png",
      },
      // Apple touch icon - serve from root for all locales
      {
        source: "/:locale(it|en|fr|de|es)/apple-touch-icon.png",
        destination: "/apple-touch-icon.png",
      },
      // Robots and sitemap
      {
        source: "/:locale(it|en|fr|de|es)/robots.txt",
        destination: "/robots.txt",
      },
      {
        source: "/:locale(it|en|fr|de|es)/sitemap.xml",
        destination: "/sitemap.xml",
      },
    ];
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
          // Content-Security-Policy moved to src/proxy.ts (nonce-based)
          // See F-03: CSP proxy for XSS protection
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

// Check if Sentry auth token is available for source map uploads
const hasSentryToken = !!process.env.SENTRY_AUTH_TOKEN;

// Sentry configuration options
const sentryConfig = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG || "fightthestroke",
  project: process.env.SENTRY_PROJECT || "mirrorbuddy",

  // Pass auth token explicitly to avoid "No auth token" warnings
  // Only set if token exists to prevent warnings in Preview builds
  ...(hasSentryToken && { authToken: process.env.SENTRY_AUTH_TOKEN }),

  // ALWAYS silent to suppress all Sentry CLI output
  // Prevents 232+ warnings from source map upload for Next.js manifest files
  // See ADR 0067 for details
  silent: true,

  // Disable telemetry to reduce noise
  telemetry: false,

  // Skip source map upload if no auth token (Preview environments)
  // This prevents "No auth token provided" warnings
  sourcemaps: hasSentryToken
    ? {
        ignore: [
          "**/page_client-reference-manifest.js",
          "**/_buildManifest.js",
          "**/_ssgManifest.js",
        ],
      }
    : {
        disable: true,
      },

  // Skip release creation if no auth token
  release: hasSentryToken
    ? {
        // Auto-detect from git
      }
    : {
        create: false,
      },

  // Upload source maps for better error tracking (only if token available)
  widenClientFileUpload: hasSentryToken,

  // Serve source maps publicly (don't hide them)
  // Combined with productionBrowserSourceMaps: true, this ensures .map files exist
  hideSourceMaps: false,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: "/monitoring",

  // Webpack-specific options (new API)
  webpack: {
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
    // Automatically instrument React components
    reactComponentAnnotation: {
      enabled: true,
    },
  },
};

// Sentry wrapper can be disabled locally if causing build issues
// Set DISABLE_SENTRY_BUILD=true to skip Sentry instrumentation
// Note: Order matters - withNextIntl must wrap the final config for i18n to work
const config = withNextIntl(withBundleAnalyzer(nextConfig));
export default process.env.DISABLE_SENTRY_BUILD === "true"
  ? config
  : withSentryConfig(config, sentryConfig);
