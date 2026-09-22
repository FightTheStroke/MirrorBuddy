import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';

if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
  throw new Error('Media composition is local-test only');
}
const runtime = process.env.C5_BROWSER_RUNTIME
  ? // eslint-disable-next-line security/detect-non-literal-fs-filename -- The trusted local runner creates private runtime.json and supplies its path; this config does not accept browser input.
    JSON.parse(readFileSync(process.env.C5_BROWSER_RUNTIME, 'utf8'))
  : { preparationOnly: true };

export default defineConfig({
  testDir: './e2e/media-composition',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: runtime.outputDir
    ? [['list'], ['json', { outputFile: `${runtime.outputDir}/results.json` }]]
    : 'list',
  outputDir: runtime.outputDir ?? '/tmp/c5-browser-not-started',
  metadata: { composition: runtime },
  use: {
    browserName: 'chromium',
    baseURL: runtime.origin,
    storageState: { cookies: [], origins: [] },
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    serviceWorkers: 'allow',
    contextOptions: { reducedMotion: 'reduce' },
  },
});
