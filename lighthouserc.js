/**
 * Lighthouse CI Configuration
 *
 * Performance budgets for MirrorBuddy
 * ISE Engineering Fundamentals: Performance Testing
 *
 * Run with: npx lhci autorun
 */

module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/welcome',
        'http://localhost:3000/astuccio',
        'http://localhost:3000/admin',
      ],
      numberOfRuns: 3,
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready on',
      startServerReadyTimeout: 30000,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Overall Performance Score
        // F-17, F-28: Target 90% (0.9) performance score
        'categories:performance': ['error', { minScore: 0.9 }],

        // Core Web Vitals (F-17)
        // LCP: Largest Contentful Paint - 2500ms max
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],

        // FID: First Input Delay - 100ms max
        'first-input-delay': ['error', { maxNumericValue: 100 }],

        // CLS: Cumulative Layout Shift - 0.1 max
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],

        // TTI: Time to Interactive - 3800ms max
        'interactive': ['error', { maxNumericValue: 3800 }],

        // Additional Performance Metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],

        // Accessibility (WCAG 2.1 AA - critical for DSA students)
        // F-28: Target 90% accessibility score
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'button-name': 'error',

        // Best Practices
        'categories:best-practices': ['warn', { minScore: 0.9 }],

        // SEO
        'categories:seo': ['warn', { minScore: 0.8 }],

        // PWA (optional for now)
        'categories:pwa': 'off',

        // Relax some rules for dynamic content
        'unsized-images': 'warn',
        'offscreen-images': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
