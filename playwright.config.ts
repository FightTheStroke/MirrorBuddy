import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { config } from "dotenv";

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

// CRITICAL: Validate test database URL to prevent production contamination
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://roberdan@localhost:5432/mirrorbuddy_test";

// PRODUCTION BLOCKER: Reject production Supabase URLs
if (testDatabaseUrl.includes("supabase.com")) {
  throw new Error(
    `❌ BLOCKED: E2E tests attempted to use production Supabase database!\n` +
      `TEST_DATABASE_URL must be a local test database, not: ${testDatabaseUrl}\n` +
      `Set TEST_DATABASE_URL=postgresql://roberdan@localhost:5432/mirrorbuddy_test`,
  );
}

// Also check DATABASE_URL doesn't leak into tests
if (
  process.env.DATABASE_URL &&
  process.env.DATABASE_URL.includes("supabase.com")
) {
  console.warn(
    "⚠️  WARNING: DATABASE_URL contains production Supabase URL. " +
      "E2E tests will use TEST_DATABASE_URL instead to prevent data corruption.",
  );
}

// Configure screenshot comparison settings
export const screenshotComparisonOptions = {
  maxDiffPixels: undefined, // Use threshold instead
  threshold: 0.1, // Allow 10% pixel difference
} as const;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
      // Exclude tests that require external services or complex database state in CI
      testIgnore: process.env.CI
        ? [
            "**/cookie-signing.spec.ts",
            "**/voice-api.spec.ts", // Requires WebSocket proxy
            "**/chat-tools-integration.spec.ts", // Requires AI provider
            "**/maestro-conversation.spec.ts", // Requires AI provider
            "**/api-backend.spec.ts", // Requires complex DB state
            "**/tools-api.spec.ts", // Requires complex DB state
            "**/admin-dashboard.spec.ts", // Requires metrics tables
            "**/gdpr-compliance.spec.ts", // Requires complex DB state
            "**/google-drive.spec.ts", // Requires Google OAuth
            "**/full-app-smoke.spec.ts", // Requires full UI
            "**/auth-system.spec.ts", // Requires session/auth setup
            "**/critical-api-routes.spec.ts", // Requires proper API environment
            "**/maestri-data.spec.ts", // Requires full UI rendering
            "**/mobile/**", // Exclude mobile tests from desktop project
          ]
        : ["**/cookie-signing.spec.ts", "**/mobile/**"],
    },
    {
      // Cookie-signing tests need to run without storage state to test fresh cookies
      name: "cookie-signing",
      use: {
        ...devices["Desktop Chrome"],
        storageState: undefined, // Don't use storage state - start fresh
      },
      testMatch: "**/cookie-signing.spec.ts",
      // Skip in CI - requires session management
      ...(process.env.CI && { testIgnore: "**/*" }),
    },
    // Mobile viewport projects for responsive design testing (ADR 0064)
    {
      name: "iphone-se",
      use: {
        ...devices["iPhone SE"],
        // iPhone SE 2022: 375px × 667px (16:9)
      },
      testMatch: "**/mobile/**/*.spec.ts",
    },
    {
      name: "iphone-13",
      use: {
        ...devices["iPhone 13"],
        // iPhone 13: 390px × 844px (19.5:9)
      },
      testMatch: "**/mobile/**/*.spec.ts",
    },
    {
      name: "pixel-7",
      use: {
        ...devices["Pixel 7"],
        // Pixel 7: 412px × 915px (19.5:9)
      },
      testMatch: "**/mobile/**/*.spec.ts",
    },
    {
      name: "ipad-mini",
      use: {
        ...devices["iPad Mini"],
        // iPad Mini: 768px × 1024px (4:3) portrait
      },
      testMatch: "**/mobile/**/*.spec.ts",
    },
    {
      name: "ipad-landscape",
      use: {
        ...devices["iPad Mini landscape"],
        // iPad Mini landscape: 1024px × 768px (4:3)
      },
      testMatch: "**/mobile/**/*.spec.ts",
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
    timeout: 120000,
    env: {
      // CRITICAL: Use ONLY test database - NEVER fallback to production DATABASE_URL
      // This prevents accidental contamination of production Supabase database
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      DIRECT_URL:
        process.env.TEST_DIRECT_URL ||
        "postgresql://roberdan@localhost:5432/mirrorbuddy_test",
      E2E_TESTS: "1",
      // Session secret for cookie signing - MUST match global-setup.ts E2E_SESSION_SECRET
      // Always use test secret for E2E to ensure cookie signatures match
      SESSION_SECRET: "e2e-test-session-secret-32-characters-min",
      // CRON_SECRET for data-retention tests (ensures 401 when missing auth header)
      CRON_SECRET: "e2e-test-cron-secret",
      // Enable Ollama provider flag to bypass /landing redirect (no actual Ollama needed)
      NEXT_PUBLIC_OLLAMA_ENABLED: "true",
    },
  },
});
