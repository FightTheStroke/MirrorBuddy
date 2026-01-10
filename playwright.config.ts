import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * mirrorbuddy-Edu E2E Test Configuration
 * Tests for educational platform with AI-powered tutoring
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
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports disabled - app optimized for desktop
    // Re-enable when mobile optimization begins:
    // { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    // { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],

  webServer: {
    command: 'env -u NO_COLOR -u FORCE_COLOR npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      DATABASE_URL: 'postgresql://roberdan@localhost:5432/mirrorbuddy',
      DIRECT_URL: 'postgresql://roberdan@localhost:5432/mirrorbuddy',
      E2E_TESTS: '1',
    },
  },
});
