#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'apps/web/test-results/ci-e2e');
const lastRun = resolve(output, '.last-run.json');
const args = [
  resolve(root, 'node_modules/@playwright/test/cli.js'),
  'test',
  '--config=apps/web/playwright.config.ts',
  '--project=chromium',
  '--reporter=list',
  `--output=${output}`,
];

function run(lastFailed = false) {
  const result = spawnSync(process.execPath, [...args, ...(lastFailed ? ['--last-failed'] : [])], {
    cwd: root,
    stdio: 'inherit',
    timeout: 20 * 60 * 1000,
  });
  if (result.error) throw result.error;
  if (result.signal || result.status === null) {
    throw new Error(`Playwright interrupted (${result.signal ?? 'no exit status'})`);
  }
  return result.status;
}

function hasFailedTests() {
  if (!existsSync(lastRun)) return false;
  const report = JSON.parse(readFileSync(lastRun, 'utf8'));
  if (
    !report ||
    report.status !== 'failed' ||
    !Array.isArray(report.failedTests) ||
    !report.failedTests.every((id) => typeof id === 'string' && id.length > 0)
  ) {
    throw new Error('Invalid Playwright last-run report; refusing an unreliable retry selection');
  }
  return report.failedTests.length > 0;
}

try {
  // Never let a previous local execution decide what this run retries.
  rmSync(lastRun, { force: true });
  let status = run();
  if (status !== 0) {
    const lastFailed = hasFailedTests();
    process.stdout.write(
      lastFailed
        ? 'Retrying failed tests only; successful cases are not repeated.\n'
        : 'Retrying the full suite: the first attempt produced no failed-test identities.\n',
    );
    status = run(lastFailed);
  }
  process.exitCode = status;
} catch (error) {
  process.stderr.write(
    `E2E retry failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
