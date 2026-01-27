/**
 * Lighthouse CI Configuration (SEO Focus)
 *
 * Run with: E2E_TESTS=1 TEST_DATABASE_URL="postgresql://testuser:testpass@localhost:5432/test" npx lhci autorun
 */

module.exports = {
  ci: {
    collect: {
      url: [
        // Default locale (Italian) - static pages for SEO audit
        'http://localhost:3000/it/privacy',
        'http://localhost:3000/it/terms',

        // English locale (en) - static pages for SEO audit
        'http://localhost:3000/en/privacy',
        'http://localhost:3000/en/terms',

        // Spanish locale (es) - static pages for SEO audit
        'http://localhost:3000/es/privacy',
        'http://localhost:3000/es/terms',

        // Additional French locale for completeness
        'http://localhost:3000/fr/privacy',
        'http://localhost:3000/fr/terms',
      ],
      numberOfRuns: 1,
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'compiled client and server successfully',
      startServerReadyTimeout: 60000,
    },
    assert: {
      // SEO Category: Target 90% for all locales (F-81)
      preset: 'lighthouse:all',
      assertions: {
        'categories:seo': ['error', { minScore: 0.9 }],

        // Core SEO checks
        'is-crawlable': 'error',
        'meta-description': 'error',
        'http-status-code': 'error',
        'robots-txt': 'warn',
        'hreflang': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
