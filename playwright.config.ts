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
    },
  },
});
