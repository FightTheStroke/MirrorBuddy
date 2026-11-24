import { defineConfig } from '@playwright/test';
// Demo capture only: local app on :3100, private scratch Postgres on :5544. No webServer, no global setup.
const db = process.env.TEST_DATABASE_URL ?? '';
if (!/^postgresql:\/\/demo@127\.0\.0\.1:5544\//.test(db)) throw new Error('demo capture requires the scratch database');
export default defineConfig({
  testDir: __dirname,
  testMatch: /.*\.demo\.ts$/,
  workers: 1,
  timeout: 300000,
  reporter: 'line',
  outputDir: (process.env.DEMO_WORK ?? __dirname + '/../work') + '/pw-out',
  use: {
    baseURL: 'http://localhost:3100',
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    viewport: { width: 1440, height: 810 },
    deviceScaleFactor: 2,
    // Optional: point at a specific installed Chromium when the bundled build is missing.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
});
