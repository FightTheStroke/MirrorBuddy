import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// The general Chromium project excludes trial/**; retain all base production guards.
export default defineConfig({
  ...base,
  projects: [
    {
      name: 'trial-compliance',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/trial/consent-gate.spec.ts', '**/trial/privacy-ownership.spec.ts'],
    },
  ],
});
