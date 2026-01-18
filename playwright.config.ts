import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * MirrorBuddy E2E Test Configuration
 * Tests for educational platform with AI-powered tutoring
 *
 * Environment: Clears color env vars to ensure consistent test output.
 * DATABASE_URL: Optional - tests use mock data when not provided.
 */
delete process.env.NO_COLOR;
delete process.env.FORCE_COLOR;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  // Global setup: sets onboarding as completed
  globalSetup: path.join(__dirname, 'e2e', 'global-setup.ts'),

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Use storage state with onboarding completed
    storageState: path.join(__dirname, 'e2e', '.auth', 'storage-state.json'),
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // Exclude tests that require external services or complex database state in CI
      testIgnore: process.env.CI
        ? [
            '**/cookie-signing.spec.ts',
            '**/voice-api.spec.ts',           // Requires WebSocket proxy
            '**/chat-tools-integration.spec.ts', // Requires AI provider
            '**/maestro-conversation.spec.ts',   // Requires AI provider
            '**/api-backend.spec.ts',            // Requires complex DB state
            '**/tools-api.spec.ts',              // Requires complex DB state
            '**/admin-dashboard.spec.ts',        // Requires metrics tables
            '**/gdpr-compliance.spec.ts',        // Requires complex DB state
            '**/google-drive.spec.ts',           // Requires Google OAuth
            '**/full-app-smoke.spec.ts',         // Requires full UI
            '**/auth-system.spec.ts',            // Requires session/auth setup
            '**/critical-api-routes.spec.ts',    // Requires proper API environment
            '**/maestri-data.spec.ts',           // Requires full UI rendering
          ]
        : '**/cookie-signing.spec.ts',
    },
    {
      // Cookie-signing tests need to run without storage state to test fresh cookies
      name: 'cookie-signing',
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined, // Don't use storage state - start fresh
      },
      testMatch: '**/cookie-signing.spec.ts',
      // Skip in CI - requires session management
      ...(process.env.CI && { testIgnore: '**/*' }),
    },
    // Other browsers disabled - only testing API/backend, not cross-browser UI
    // Re-enable if needed:
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      // Pass through database URLs if set in environment
      ...(process.env.DATABASE_URL && { DATABASE_URL: process.env.DATABASE_URL }),
      ...(process.env.DIRECT_URL && { DIRECT_URL: process.env.DIRECT_URL }),
      E2E_TESTS: '1',
      // Session secret for cookie signing (required for cookie-signing.spec.ts)
      SESSION_SECRET: process.env.SESSION_SECRET || 'e2e-test-session-secret-32-characters-min',
      // CRON_SECRET for data-retention tests (ensures 401 when missing auth header)
      CRON_SECRET: 'e2e-test-cron-secret',
      // Enable Ollama provider flag to bypass /landing redirect (no actual Ollama needed)
      NEXT_PUBLIC_OLLAMA_ENABLED: 'true',
    },
  },
});
