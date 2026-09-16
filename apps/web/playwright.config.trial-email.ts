import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

if (!base.webServer || Array.isArray(base.webServer)) {
  throw new Error('Trial email checks require the guarded local test web server');
}

export default defineConfig({
  ...base,
  webServer: {
    ...base.webServer,
    env: {
      ...base.webServer.env,
      // Exercise the real API's delivery failure before any external email request.
      RESEND_API_KEY: 're_compliance_test_not_a_real_key',
      FROM_EMAIL: '',
    },
  },
  projects: [
    {
      name: 'trial-optional-email',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/trial/optional-email.spec.ts',
    },
  ],
});
