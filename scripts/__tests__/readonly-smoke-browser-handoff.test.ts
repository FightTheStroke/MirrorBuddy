// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { smokeStep } from './readonly-smoke-workflow-fixtures';

const readonlyValue = 'synthetic-readonly-handoff-not-a-credential';
const databaseKeys = [
  'DATABASE_URL',
  'DIRECT_URL',
  'DEV_DATABASE_URL',
  'TEST_DATABASE_URL',
  'TEST_DIRECT_URL',
  'SESSION_SECRET',
  'SESSION_SECRET_PREVIOUS',
  'ADMIN_PASSWORD',
  'PGPASSWORD',
  'PII_ENCRYPTION_KEY',
];

function runHandoff(token: string | null, exitCode = 0) {
  const directory = mkdtempSync(join(tmpdir(), 'mirrorbuddy-smoke-handoff-'));
  try {
    const runDirectory = join(directory, 'readonly-smoke-123-1');
    mkdirSync(runDirectory, { mode: 0o700 });
    if (typeof token === 'string')
      writeFileSync(join(runDirectory, 'token'), token, { mode: 0o600 });
    const runner = join(directory, 'npm');
    writeFileSync(
      runner,
      `#!${process.execPath}
const keys = ${JSON.stringify(databaseKeys)};
console.log(JSON.stringify({
  readonlyMatches: process.env.ADMIN_READONLY_COOKIE_VALUE === ${JSON.stringify(readonlyValue)},
  studentUnchanged: process.env.PROD_TEST_USER_COOKIE_VALUE === 'synthetic-student-value',
  forbiddenKeys: keys.filter(key => Object.hasOwn(process.env, key)),
  args: process.argv.slice(2)
}));
process.exitCode = ${exitCode};
`,
    );
    chmodSync(runner, 0o700);
    return spawnSync('bash', ['-e', '-o', 'pipefail', '-c', smokeStep('smoke').run ?? ''], {
      encoding: 'utf8',
      env: {
        PATH: `${directory}:/usr/bin:/bin`,
        RUNNER_TEMP: directory,
        GITHUB_RUN_ID: '123',
        GITHUB_RUN_ATTEMPT: '1',
        PROD_TEST_USER_COOKIE_VALUE: 'synthetic-student-value',
        ...Object.fromEntries(databaseKeys.map((key) => [key, 'synthetic-forbidden-value'])),
      },
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('actual workflow shell credential handoff', () => {
  it('reaches the database safety guard through the actual conditioned seed command', () => {
    const result = spawnSync('pnpm', ['run', 'seed:admin'], {
      encoding: 'utf8',
      env: {
        HOME: process.env.HOME,
        PATH: process.env.PATH,
        CI: '1',
        NODE_ENV: 'production',
        DOTENV_CONFIG_PATH: '/dev/null',
        E2E_TESTS: '1',
        DATABASE_URL: '',
        DIRECT_URL: '',
        DEV_DATABASE_URL: '',
        TEST_DATABASE_URL: '',
        TEST_DIRECT_URL: '',
      },
    });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('TEST_DATABASE_URL must be set');
    expect(result.stdout + result.stderr).not.toContain('Client Component module');
  });

  it('privately passes the readonly value without DB/signing credentials or token output', () => {
    const result = runHandoff(readonlyValue);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      readonlyMatches: true,
      studentUnchanged: true,
      forbiddenKeys: [],
      args: ['run', 'test:smoke:prod'],
    });
    expect(result.stdout + result.stderr).not.toContain(readonlyValue);
    expect(result.stdout + result.stderr).not.toContain('synthetic-student-value');
  });

  it.each([null, '', '\n', '   '])('fails before starting smoke for unusable input %j', (token) => {
    const result = runHandoff(token);
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('Readonly smoke credential');
    expect(result.stdout).not.toContain('readonlyMatches');
  });

  it('preserves a failing browser exit instead of reporting success', () => {
    const result = runHandoff(readonlyValue, 7);
    expect(result.status).toBe(7);
  });
});
