import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { config } from 'dotenv';
import { isSupabaseUrl } from './src/lib/utils/url-validation';

// Load .env file for TEST_DATABASE_URL
config();

/**
 * MirrorBuddy E2E Test Configuration
 * Tests for educational platform with AI-powered tutoring
 *
 * Environment: Clears color env vars to ensure consistent test output.
 * DATABASE_URL: Optional - tests use mock data when not provided.
 * PRODUCTION BLOCKING: global-setup.ts enforces NODE_ENV !== "production" (F-03)
 *   E2E tests are blocked in production to prevent real user data corruption.
 *   If tests attempt to run in production, global-setup.ts will throw an error.
 *
 * Visual Regression: Configure with expect.toHaveScreenshot() for consistency testing
 */
delete process.env.NO_COLOR;
delete process.env.FORCE_COLOR;

// ============================================================================
// CRITICAL PRODUCTION GUARDS - NEVER REMOVE THESE CHECKS
// ============================================================================

// GUARD #1: TEST_DATABASE_URL must be set and local
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl || testDatabaseUrl.trim() === '') {
  throw new Error(
    `🚨 BLOCKED: TEST_DATABASE_URL is not set!\n` +
      `E2E tests require an explicit local test database.\n` +
      `Add to .env: TEST_DATABASE_URL=postgresql://roberdan@localhost:5432/mirrorbuddy_test\n` +
      `NEVER use production DATABASE_URL for tests.`,
  );
}

// GUARD #2: TEST_DATABASE_URL must NOT be Supabase
if (isSupabaseUrl(testDatabaseUrl)) {
  throw new Error(
    `🚨 BLOCKED: TEST_DATABASE_URL points to production Supabase!\n` +
      `TEST_DATABASE_URL: ${testDatabaseUrl}\n` +
      `E2E tests MUST use a local PostgreSQL database.\n` +
      `Set TEST_DATABASE_URL=postgresql://roberdan@localhost:5432/mirrorbuddy_test`,
  );
}

// GUARD #3: DATABASE_URL must NOT leak into test environment
if (process.env.DATABASE_URL && isSupabaseUrl(process.env.DATABASE_URL)) {
  // This is expected in .env, but we OVERRIDE it in webServer.env below
  console.log(
    '⚠️  DATABASE_URL contains production Supabase URL.\n' +
      '   This will be OVERRIDDEN with TEST_DATABASE_URL in test webServer.\n' +
      '   If you see test data in production, THIS OVERRIDE FAILED.',
  );
}

// GUARD #4: Fallback safety (should never be reached if .env is correct)
const finalTestDb = testDatabaseUrl || 'postgresql://roberdan@localhost:5432/mirrorbuddy_test';

// Dynamic port for parallel agent isolation (separate worktrees use different ports)
const appPort = process.env.MIRRORBUDDY_PORT || '3000';
const appBaseURL = `http://localhost:${appPort}`;

// Configure screenshot comparison settings
export const screenshotComparisonOptions = {
  maxDiffPixels: undefined, // Use threshold instead
  threshold: 0.1, // Allow 10% pixel difference
} as const;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 2 min default timeout in CI, 30s local
  timeout: process.env.CI ? 120000 : 30000,
  // 3 retries in CI to handle flaky tests (hydration timing, SSE, network)
  retries: process.env.CI ? 3 : 0,
  // Use 2 workers for mobile tests (CI_MOBILE_TESTS=1) to reduce resource contention
  workers: process.env.CI ? (process.env.CI_MOBILE_TESTS ? 2 : 4) : undefined,
  reporter: [['list'], ['json', { outputFile: 'test-results/pw-results.json' }]],

  // Global setup: sets onboarding as completed
  globalSetup: path.join(__dirname, 'e2e', 'global-setup.ts'),
  // Global teardown: cleans up test users after all tests
  globalTeardown: path.join(__dirname, 'e2e', 'global-teardown.ts'),

  // Visual regression threshold for screenshot comparisons
  expect: {
    toHaveScreenshot: {
      threshold: 0.1, // Allow 10% pixel difference tolerance
      animations: 'disabled', // Disable animations for consistent snapshots
    },
  },

  // Visual regression settings for screenshot comparisons
  snapshotDir: path.join(__dirname, 'e2e', 'full-ui-audit', '__snapshots__'),
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-{platform}{ext}',

  use: {
    baseURL: appBaseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Use storage state with onboarding completed
    storageState: path.join(__dirname, 'e2e', '.auth', 'storage-state.json'),

    // Visual regression settings
    ...(process.env.VISUAL_REGRESSION && {
      viewport: { width: 1280, height: 720 },
    }),
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // Exclude tests that require external services or complex database state
      // Same list for CI and local - these tests require setup we don't always have
      testIgnore: [
        '**/cookie-signing.spec.ts', // Needs fresh session (runs in dedicated project)
        '**/voice-api.spec.ts', // Requires WebSocket proxy
        '**/chat-tools-integration.spec.ts', // Requires AI provider (Azure/Ollama)
        '**/maestro-conversation.spec.ts', // Requires AI provider (Azure/Ollama)
        '**/api-backend.spec.ts', // Requires complex DB state (conversations, users)
        '**/tools-api.spec.ts', // Requires complex DB state (materials)
        '**/admin-dashboard.spec.ts', // Requires metrics tables + admin auth
        '**/admin-funnel.spec.ts', // Requires admin auth + funnel metrics
        '**/admin-locale-preview.spec.ts', // Requires admin auth + locale setup
        '**/admin-locales.spec.ts', // Requires admin auth + locale data
        '**/admin-sidebar.spec.ts', // Requires admin auth
        '**/admin-sse-reconnection.spec.ts', // Requires admin auth + SSE server setup
        '**/admin-sse.spec.ts', // Requires admin auth + SSE server setup
        '**/admin-visual-regression-*.spec.ts', // Requires admin auth + visual baselines
        '**/admin.spec.ts', // Requires admin credentials setup
        '**/gdpr-compliance.spec.ts', // Requires complex DB state (user data)
        '**/google-drive.spec.ts', // Requires Google OAuth credentials
        '**/auth-system.spec.ts', // Requires session/auth setup
        '**/auth.spec.ts', // Requires proper auth flow setup
        '**/authorization-cookies.spec.ts', // Requires cookie/session setup
        '**/critical-api-routes.spec.ts', // Requires proper API environment + auth
        '**/invite.spec.ts', // Requires invite system + admin auth
        '**/maestri-data.spec.ts', // Requires full UI rendering
        '**/test-data-cleanup.spec.ts', // Requires DB state
        '**/tier-enforcement.spec.ts', // Requires tier seeding + /pricing page (Plan 073)
        '**/admin-tiers.spec.ts', // Requires tier seeding (Plan 073)
        '**/analytics-responsive-grid.spec.ts', // Requires parent dashboard auth
        '**/parent-dashboard-*.spec.ts', // Requires parent dashboard auth
        '**/csrf-protection.spec.ts', // Runs in Security E2E CI job
        '**/compliance.spec.ts', // Runs in Compliance E2E CI job
        '**/legal-data-privacy.spec.ts', // Runs in Compliance E2E CI job
        '**/full-app-smoke.spec.ts', // Runs in Smoke Tests CI job
        '**/smoke/**', // Runs in Smoke Tests CI job
        '**/auth/sso-*.spec.ts', // SSO tables not yet migrated
        '**/marketing/**', // Requires TrialConsentGate bypass
        '**/trial/**', // Requires trial-specific fixture setup
        '**/locale-fixtures-basic.spec.ts', // Requires NEXT_PUBLIC_SITE_URL + locale infra
        '**/locale-fixtures-integration.spec.ts', // Requires locale switching infra
        '**/welcome-i18n.spec.ts', // Requires NEXT_PUBLIC_SITE_URL for metadata
        '**/debug-endpoints-security.spec.ts', // Tests dev-only debug endpoints
        '**/legal-ai-act.spec.ts', // Requires /ai-transparency page setup
        '**/mobile/**', // Mobile tests run in dedicated projects
        '**/accessibility.spec.ts', // A11y tests run in dedicated project
        '**/a11y-*.spec.ts', // A11y tests run in dedicated project
      ],
    },
    {
      // Accessibility tests run in a dedicated project to avoid duplication
      // with the accessibility-tests CI job (WCAG 2.1 AA compliance)
      // Higher retries due to hydration timing sensitivity in CI
      name: 'a11y',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/accessibility.spec.ts', '**/a11y-*.spec.ts'],
      retries: process.env.CI ? 3 : 0,
    },
    {
      // Cookie-signing tests need to run without storage state to test fresh cookies
      name: 'cookie-signing',
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined, // Don't use storage state - start fresh
      },
      testMatch: '**/cookie-signing.spec.ts',
    },
    // Mobile viewport projects for responsive design testing (ADR 0064)
    // CI STRATEGY: Run 3 core devices in CI (iPhone SE, Pixel 7, iPad Mini) for coverage
    // Run locally for full device matrix: npx playwright test --project=iphone-13
    // NOTE: Device-specific tests match only their target devices; responsive-layout runs on all
    //
    // CI_MOBILE_TESTS env var controls mobile test execution:
    // - Set by mobile-e2e CI job to enable mobile tests
    // - Not set = mobile tests skipped (default chromium-only behavior)
    {
      name: 'iphone-se',
      use: {
        ...devices['iPhone SE'],
        // iPhone SE 2022: 375px × 667px (smallest modern iPhone)
        // Use Chromium in CI for consistent cross-platform behavior
        browserName: 'chromium',
      },
      // Extended timeout for mobile tests
      timeout: 120000,
      testMatch: [
        '**/mobile/iphone.spec.ts',
        '**/mobile/responsive-layout.spec.ts',
        '**/mobile/regression-guard.spec.ts',
      ],
      // ENABLED in CI when CI_MOBILE_TESTS=1, otherwise skip
      ...(process.env.CI && !process.env.CI_MOBILE_TESTS && { testIgnore: '**/*' }),
    },
    {
      name: 'iphone-13',
      use: {
        ...devices['iPhone 13'],
        // iPhone 13: 390px × 844px (19.5:9)
        browserName: 'chromium',
      },
      testMatch: [
        '**/mobile/iphone.spec.ts',
        '**/mobile/responsive-layout.spec.ts',
        '**/mobile/regression-guard.spec.ts',
      ],
      // Skip in CI - covered by iphone-se (similar viewport)
      ...(process.env.CI && { testIgnore: '**/*' }),
    },
    {
      name: 'pixel-7',
      use: {
        ...devices['Pixel 7'],
        // Pixel 7: 412px × 915px (standard Android flagship)
      },
      // Extended timeout for mobile tests
      timeout: 120000,
      testMatch: [
        '**/mobile/android.spec.ts',
        '**/mobile/responsive-layout.spec.ts',
        '**/mobile/regression-guard.spec.ts',
      ],
      // ENABLED in CI when CI_MOBILE_TESTS=1
      ...(process.env.CI && !process.env.CI_MOBILE_TESTS && { testIgnore: '**/*' }),
    },
    {
      name: 'ipad-mini',
      use: {
        ...devices['iPad Mini'],
        // iPad Mini: 768px × 1024px (tablet breakpoint)
        browserName: 'chromium',
      },
      // Extended timeout for mobile tests
      timeout: 120000,
      testMatch: [
        '**/mobile/ipad.spec.ts',
        '**/mobile/responsive-layout.spec.ts',
        '**/mobile/regression-guard.spec.ts',
      ],
      // ENABLED in CI when CI_MOBILE_TESTS=1
      ...(process.env.CI && !process.env.CI_MOBILE_TESTS && { testIgnore: '**/*' }),
    },
    {
      name: 'ipad-landscape',
      use: {
        ...devices['iPad Mini landscape'],
        // iPad Mini landscape: 1024px × 768px (4:3)
        browserName: 'chromium',
      },
      testMatch: [
        '**/mobile/ipad.spec.ts',
        '**/mobile/responsive-layout.spec.ts',
        '**/mobile/regression-guard.spec.ts',
      ],
      // Skip in CI - tablet portrait (ipad-mini) is sufficient
      ...(process.env.CI && { testIgnore: '**/*' }),
    },
    // Samsung devices - most popular Android phones
    {
      name: 'galaxy-s24',
      use: {
        ...devices['Galaxy S24'],
        // Galaxy S24: 360px × 780px (flagship 2024)
      },
      testMatch: ['**/mobile/android.spec.ts', '**/mobile/responsive-layout.spec.ts'],
      // Skip in CI - covered by pixel-7
      ...(process.env.CI && { testIgnore: '**/*' }),
    },
    {
      name: 'galaxy-a55',
      use: {
        ...devices['Galaxy A55'],
        // Galaxy A55: 412px × 915px (popular mid-range)
      },
      testMatch: ['**/mobile/android.spec.ts', '**/mobile/responsive-layout.spec.ts'],
      // Skip in CI - same viewport as pixel-7
      ...(process.env.CI && { testIgnore: '**/*' }),
    },
    {
      name: 'galaxy-tab-s9',
      use: {
        ...devices['Galaxy Tab S9'],
        // Galaxy Tab S9: tablet Android
        browserName: 'chromium',
      },
      testMatch: [
        '**/mobile/ipad.spec.ts', // Reuse tablet tests
        '**/mobile/responsive-layout.spec.ts',
      ],
      // Skip in CI - covered by ipad-mini
      ...(process.env.CI && { testIgnore: '**/*' }),
    },
    // iPhone 15 Pro - latest flagship
    {
      name: 'iphone-15-pro',
      use: {
        ...devices['iPhone 15 Pro'],
        // iPhone 15 Pro: 393px × 852px (Dynamic Island)
        browserName: 'chromium',
      },
      testMatch: ['**/mobile/iphone.spec.ts', '**/mobile/responsive-layout.spec.ts'],
      // Skip in CI - similar to iphone-13
      ...(process.env.CI && { testIgnore: '**/*' }),
    },
    // Other browsers disabled - only testing API/backend, not cross-browser UI
    // Re-enable if needed:
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    // Use production server in CI (pre-built), dev server locally
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: appBaseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 90000,
    env: {
      // Override PORT to match MIRRORBUDDY_PORT (default 3000)
      PORT: appPort,
      // CRITICAL: OVERRIDE DATABASE_URL with test database
      // This prevents accidental contamination of production Supabase database
      // BOTH values set to same test DB to ensure no fallback to production
      DATABASE_URL: finalTestDb,
      TEST_DATABASE_URL: finalTestDb,
      DIRECT_URL: process.env.TEST_DIRECT_URL || finalTestDb, // Same DB for direct connection
      E2E_TESTS: '1',
      // Next.js dev server expects NODE_ENV=development.
      // Setting NODE_ENV=test can break Next internals (e.g. missing .next/dev artifacts),
      // while E2E_TESTS already gates test-only behavior in the app.
      NODE_ENV: process.env.CI ? 'production' : 'development',
      // Session secret for cookie signing - MUST match global-setup.ts E2E_SESSION_SECRET
      // Always use test secret for E2E to ensure cookie signatures match
      SESSION_SECRET: 'e2e-test-session-secret-32-characters-min',
      // CRON_SECRET for data-retention tests (ensures 401 when missing auth header)
      CRON_SECRET: 'e2e-test-cron-secret',
      // Enable Ollama provider flag to bypass /landing redirect (no actual Ollama needed)
      // NOTE: NEXT_PUBLIC_* is inlined at build time, so we also set OLLAMA_URL for runtime check
      NEXT_PUBLIC_OLLAMA_ENABLED: 'true',
      OLLAMA_URL: 'http://localhost:11434', // Dummy URL - not actually called, just bypasses provider check
    },
  },
});
