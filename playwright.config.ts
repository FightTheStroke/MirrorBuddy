import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { config } from "dotenv";
import { isSupabaseUrl } from "./src/lib/utils/url-validation";

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

if (!testDatabaseUrl || testDatabaseUrl.trim() === "") {
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
    "⚠️  DATABASE_URL contains production Supabase URL.\n" +
      "   This will be OVERRIDDEN with TEST_DATABASE_URL in test webServer.\n" +
      "   If you see test data in production, THIS OVERRIDE FAILED.",
  );
}

// GUARD #4: Fallback safety (should never be reached if .env is correct)
const finalTestDb =
  testDatabaseUrl || "postgresql://roberdan@localhost:5432/mirrorbuddy_test";

// Configure screenshot comparison settings
export const screenshotComparisonOptions = {
  maxDiffPixels: undefined, // Use threshold instead
  threshold: 0.1, // Allow 10% pixel difference
} as const;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: "html",

  // Global setup: sets onboarding as completed
  globalSetup: path.join(__dirname, "e2e", "global-setup.ts"),
  // Global teardown: cleans up test users after all tests
  globalTeardown: path.join(__dirname, "e2e", "global-teardown.ts"),

  // Visual regression threshold for screenshot comparisons
  expect: {
    toHaveScreenshot: {
      threshold: 0.1, // Allow 10% pixel difference tolerance
      animations: "disabled", // Disable animations for consistent snapshots
    },
  },

  // Visual regression settings for screenshot comparisons
  snapshotDir: path.join(__dirname, "e2e", "full-ui-audit", "__snapshots__"),
  snapshotPathTemplate:
    "{snapshotDir}/{testFileDir}/{testFileName}-{platform}{ext}",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Use storage state with onboarding completed
    storageState: path.join(__dirname, "e2e", ".auth", "storage-state.json"),

    // Visual regression settings
    ...(process.env.VISUAL_REGRESSION && {
      viewport: { width: 1280, height: 720 },
    }),
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      // Exclude tests that require external services or complex database state
      // Same list for CI and local - these tests require setup we don't always have
      testIgnore: [
        "**/cookie-signing.spec.ts", // Needs fresh session (runs in dedicated project)
        "**/voice-api.spec.ts", // Requires WebSocket proxy
        "**/chat-tools-integration.spec.ts", // Requires AI provider (Azure/Ollama)
        "**/maestro-conversation.spec.ts", // Requires AI provider (Azure/Ollama)
        "**/api-backend.spec.ts", // Requires complex DB state (conversations, users)
        "**/tools-api.spec.ts", // Requires complex DB state (materials)
        "**/admin-dashboard.spec.ts", // Requires metrics tables + admin auth
        "**/admin-funnel.spec.ts", // Requires admin auth + funnel metrics
        "**/admin-sidebar.spec.ts", // Requires admin auth
        "**/admin-visual-regression-*.spec.ts", // Requires admin auth + visual baselines
        "**/gdpr-compliance.spec.ts", // Requires complex DB state (user data)
        "**/google-drive.spec.ts", // Requires Google OAuth credentials
        "**/auth-system.spec.ts", // Requires session/auth setup
        "**/critical-api-routes.spec.ts", // Requires proper API environment + auth
        "**/maestri-data.spec.ts", // Requires full UI rendering
        "**/trial-dashboard.spec.ts", // Requires proper trial state setup
        "**/test-data-cleanup.spec.ts", // Requires DB state
        "**/mobile/**", // Mobile tests run in dedicated projects
      ],
    },
    {
      // Cookie-signing tests need to run without storage state to test fresh cookies
      // DISABLED: Requires specific session management setup not available in standard runs
      name: "cookie-signing",
      use: {
        ...devices["Desktop Chrome"],
        storageState: undefined, // Don't use storage state - start fresh
      },
      testMatch: "**/cookie-signing.spec.ts",
      // Skip always - requires special session management setup
      testIgnore: "**/*",
    },
    // Mobile viewport projects for responsive design testing (ADR 0064)
    // DISABLED IN CI: Mobile tests add 5x overhead (5 projects × same tests)
    // Run locally: npx playwright test --project=iphone-13
    // NOTE: Device-specific tests match only their target devices; responsive-layout runs on all
    {
      name: "iphone-se",
      use: {
        ...devices["iPhone SE"],
        // iPhone SE 2022: 375px × 667px (16:9)
      },
      testMatch: [
        "**/mobile/iphone.spec.ts",
        "**/mobile/responsive-layout.spec.ts",
      ],
      ...(process.env.CI && { testIgnore: "**/*" }),
    },
    {
      name: "iphone-13",
      use: {
        ...devices["iPhone 13"],
        // iPhone 13: 390px × 844px (19.5:9)
      },
      testMatch: [
        "**/mobile/iphone.spec.ts",
        "**/mobile/responsive-layout.spec.ts",
      ],
      ...(process.env.CI && { testIgnore: "**/*" }),
    },
    {
      name: "pixel-7",
      use: {
        ...devices["Pixel 7"],
        // Pixel 7: 412px × 915px (19.5:9)
      },
      testMatch: [
        "**/mobile/android.spec.ts",
        "**/mobile/responsive-layout.spec.ts",
      ],
      ...(process.env.CI && { testIgnore: "**/*" }),
    },
    {
      name: "ipad-mini",
      use: {
        ...devices["iPad Mini"],
        // iPad Mini: 768px × 1024px (4:3) portrait
      },
      testMatch: [
        "**/mobile/ipad.spec.ts",
        "**/mobile/responsive-layout.spec.ts",
      ],
      ...(process.env.CI && { testIgnore: "**/*" }),
    },
    {
      name: "ipad-landscape",
      use: {
        ...devices["iPad Mini landscape"],
        // iPad Mini landscape: 1024px × 768px (4:3)
      },
      testMatch: [
        "**/mobile/ipad.spec.ts",
        "**/mobile/responsive-layout.spec.ts",
      ],
      ...(process.env.CI && { testIgnore: "**/*" }),
    },
    // Other browsers disabled - only testing API/backend, not cross-browser UI
    // Re-enable if needed:
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    // Use production server in CI (pre-built), dev server locally
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 90000,
    env: {
      // Override PORT to ensure Next.js starts on 3000 (may differ in .env)
      PORT: "3000",
      // CRITICAL: OVERRIDE DATABASE_URL with test database
      // This prevents accidental contamination of production Supabase database
      // BOTH values set to same test DB to ensure no fallback to production
      DATABASE_URL: finalTestDb,
      TEST_DATABASE_URL: finalTestDb,
      DIRECT_URL: process.env.TEST_DIRECT_URL || finalTestDb, // Same DB for direct connection
      E2E_TESTS: "1",
      NODE_ENV: "test", // Explicit test environment
      // Session secret for cookie signing - MUST match global-setup.ts E2E_SESSION_SECRET
      // Always use test secret for E2E to ensure cookie signatures match
      SESSION_SECRET: "e2e-test-session-secret-32-characters-min",
      // CRON_SECRET for data-retention tests (ensures 401 when missing auth header)
      CRON_SECRET: "e2e-test-cron-secret",
      // Enable Ollama provider flag to bypass /landing redirect (no actual Ollama needed)
      // NOTE: NEXT_PUBLIC_* is inlined at build time, so we also set OLLAMA_URL for runtime check
      NEXT_PUBLIC_OLLAMA_ENABLED: "true",
      OLLAMA_URL: "http://localhost:11434", // Dummy URL - not actually called, just bypasses provider check
    },
  },
});
