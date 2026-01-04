import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Study Kit E2E Test Configuration
 * Uses existing dev server (no webServer)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',

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
  ],

  // NO webServer - assume dev server is already running
});
