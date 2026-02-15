import type { NextConfig } from 'next';
import packageJson from './package.json';
import bundleAnalyzer from '@next/bundle-analyzer';
import createNextIntlPlugin from 'next-intl/plugin';

// Bundle analyzer configuration (enabled via ANALYZE=true)
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Next-intl plugin for internationalization
// Points to the i18n request config file
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // CRITICAL: Static export for Capacitor mobile builds
  // This generates an "out" directory with static HTML files
  // Capacitor requires static files, not a Node.js server
  output: 'export',

  // Exclude Route Handlers from mobile static export while keeping App Router pages/layouts.
  pageExtensions: [
    'page.tsx',
    'page.ts',
    'layout.tsx',
    'layout.ts',
    'loading.tsx',
    'loading.ts',
    'error.tsx',
    'error.ts',
    'not-found.tsx',
    'not-found.ts',
    'template.tsx',
    'template.ts',
    'default.tsx',
    'default.ts',
    'sitemap.ts',
    'robots.ts',
    'manifest.ts',
  ],

  // Disable image optimization for static export
  // Static export doesn't support Next.js Image Optimization API
  images: {
    unoptimized: true,
  },

  env: {
    APP_VERSION: packageJson.version,
  },

  // Enable source maps in production for debugging mobile apps
  productionBrowserSourceMaps: true,

  // Bundle optimization: Tree-shake large packages
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      'lucide-react',
      'framer-motion',
      'date-fns',
    ],
  },

  // Note: Static export does NOT support:
  // - rewrites() - handled by Capacitor routing
  // - headers() - handled by native app WebView
  // - serverActions - no server in static export
  // - middleware - runs at request time, not available in static builds
};

// Note: Sentry is intentionally disabled for mobile builds
// Mobile apps should use native crash reporting (Firebase Crashlytics, etc.)
// To enable Sentry for mobile, import withSentryConfig and wrap the config
const config = withNextIntl(withBundleAnalyzer(nextConfig));
export default config;
