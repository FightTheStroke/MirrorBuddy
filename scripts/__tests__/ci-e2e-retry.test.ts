// @vitest-environment node
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const roots: string[] = [];
function fixture(firstExit: number, secondExit: number, report: unknown) {
  const root = mkdtempSync(join(tmpdir(), 'ci-e2e-retry-'));
  roots.push(root);
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, 'node_modules/@playwright/test'), { recursive: true });
  copyFileSync(
    join(process.cwd(), 'scripts/ci-e2e-retry.mjs'),
    join(root, 'scripts/ci-e2e-retry.mjs'),
  );
  writeFileSync(
    join(root, 'node_modules/@playwright/test/cli.js'),
    `const fs = require('node:fs');
const path = require('node:path');
const calls = path.resolve('calls.json');
const history = fs.existsSync(calls) ? JSON.parse(fs.readFileSync(calls)) : [];
const args = process.argv.slice(2);
history.push(args);
fs.writeFileSync(calls, JSON.stringify(history));
const output = args.find(arg => arg.startsWith('--output=')).slice('--output='.length);
fs.mkdirSync(output, {recursive: true});
if (${JSON.stringify(report)} !== null) {
  fs.writeFileSync(path.join(output, '.last-run.json'), ${JSON.stringify(JSON.stringify(report))});
}
process.exit(history.length === 1 ? ${firstExit} : ${secondExit});
`,
  );
  const run = () =>
    spawnSync(process.execPath, ['scripts/ci-e2e-retry.mjs'], {
      cwd: root,
      encoding: 'utf8',
    });
  const calls = () => JSON.parse(readFileSync(join(root, 'calls.json'), 'utf8')) as string[][];
  return { root, run, calls };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('E2E retry preserves failures without repeating successful cases', () => {
  it.each([
    [2, 0, 3],
    [4, 1, 4],
  ])(
    'preserves native retries with %i failing attempts',
    (failures, exitCode, attempts) => {
      const root = mkdtempSync(join(tmpdir(), 'ci-e2e-native-'));
      roots.push(root);
      for (const directory of ['scripts', 'apps/web/e2e', 'node_modules/@playwright']) {
        mkdirSync(join(root, directory), { recursive: true });
      }
      copyFileSync(
        join(process.cwd(), 'scripts/ci-e2e-retry.mjs'),
        join(root, 'scripts/ci-e2e-retry.mjs'),
      );
      symlinkSync(
        join(process.cwd(), 'node_modules/@playwright/test'),
        join(root, 'node_modules/@playwright/test'),
        'dir',
      );
      writeFileSync(
        join(root, 'apps/web/playwright.config.ts'),
        "export default { testDir: './e2e', retries: 1, workers: 1, projects: [{ name: 'chromium' }] };",
      );
      writeFileSync(
        join(root, 'apps/web/e2e/retry.spec.ts'),
        `const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
test('successful case', () => fs.appendFileSync('events.txt', 'passed\\n'));
test('exhausted case', () => {
  fs.appendFileSync('events.txt', 'attempt\\n');
  const attempts = fs.readFileSync('events.txt', 'utf8').split('\\n')
    .filter(line => line === 'attempt').length;
  expect(attempts).toBeGreaterThan(${failures});
});`,
      );
      const result = spawnSync(process.execPath, ['scripts/ci-e2e-retry.mjs'], {
        cwd: root,
        encoding: 'utf8',
        timeout: 30000,
      });
      expect(result.status, result.stdout + result.stderr).toBe(exitCode);
      expect(readFileSync(join(root, 'events.txt'), 'utf8').trim().split('\n')).toEqual([
        'passed',
        ...Array.from({ length: attempts }, () => 'attempt'),
      ]);
      expect(result.stdout).toContain('Retrying failed tests only');
    },
    30000,
  );

  it('runs the complete Chromium suite once on success', () => {
    const { run, calls } = fixture(0, 0, { status: 'passed', failedTests: [] });
    expect(run().status).toBe(0);
    expect(calls()).toHaveLength(1);
    expect(calls()[0]).toContain('--project=chromium');
    expect(calls()[0]).not.toContain('--last-failed');
    expect(calls()[0].some((arg) => arg.startsWith('--retries'))).toBe(false);
  });

  it('retries only the failed test identities after exhausted native retries', () => {
    const { run, calls } = fixture(1, 0, { status: 'failed', failedTests: ['case-a'] });
    expect(run().status).toBe(0);
    expect(calls()).toHaveLength(2);
    expect(calls()[1]).toContain('--last-failed');
    expect(calls()[1].filter((arg) => arg !== '--last-failed')).toEqual(calls()[0]);
  });

  it('fails after the bounded second attempt still fails', () => {
    const { run, calls } = fixture(1, 1, { status: 'failed', failedTests: ['case-a'] });
    expect(run().status).toBe(1);
    expect(calls()).toHaveLength(2);
  });

  it.each([null, { status: 'failed', failedTests: [] }])(
    'retries infrastructure failures with no reliable test selection explicitly: %j',
    (report) => {
      const { run, calls } = fixture(1, 1, report);
      const result = run();
      expect(result.status).toBe(1);
      expect(result.stdout).toContain('Retrying the full suite');
      expect(calls()).toHaveLength(2);
      expect(calls()[1]).not.toContain('--last-failed');
    },
  );

  it('does not use a stale previous run to select the retry', () => {
    const { root, run, calls } = fixture(1, 1, null);
    const output = join(root, 'apps/web/test-results/ci-e2e');
    mkdirSync(output, { recursive: true });
    writeFileSync(join(output, '.last-run.json'), '{"status":"failed","failedTests":["stale"]}');
    expect(run().status).toBe(1);
    expect(calls()[1]).not.toContain('--last-failed');
  });

  it.each([
    { status: 'failed', failedTests: 'not-an-array' },
    { status: 'failed', failedTests: [null] },
    { status: 'passed', failedTests: ['inconsistent'] },
  ])('rejects invalid retry metadata: %j', (report) => {
    const { run, calls } = fixture(1, 0, report);
    const result = run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Invalid Playwright last-run report');
    expect(calls()).toHaveLength(1);
  });
});
