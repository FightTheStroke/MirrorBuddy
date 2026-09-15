// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { smokeStep } from './readonly-smoke-workflow-fixtures';

const readonlyValue = 'synthetic-readonly-handoff-not-a-credential';
const studentValue = `s2:${'s'.repeat(43)}.${'c'.repeat(64)}`;
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
  'PROD_TEST_USER_PASSWORD',
];

// Both spawnSync calls in this file previously had no `timeout`, so a stuck
// child process could block indefinitely; each now carries an explicit,
// finite budget, and each test's own timeout is bounded just above it.
const HANDOFF_SPAWN_TIMEOUT_MS = 60_000;
const HANDOFF_TEST_TIMEOUT_MS = 75_000;
const SEED_ADMIN_SPAWN_TIMEOUT_MS = 60_000;
const SEED_ADMIN_TEST_TIMEOUT_MS = 75_000;

function runHandoff(token: string | null, exitCode = 0, student: string | null = studentValue) {
  const directory = mkdtempSync(join(tmpdir(), 'mirrorbuddy-smoke-handoff-'));
  try {
    const runDirectory = join(directory, 'readonly-smoke-123-1');
    mkdirSync(runDirectory, { mode: 0o700 });
    if (typeof token === 'string')
      writeFileSync(join(runDirectory, 'token'), token, { mode: 0o600 });
    const studentDirectory = join(directory, 'readonly-smoke-student-123-1');
    mkdirSync(studentDirectory, { mode: 0o700 });
    if (student !== null) writeFileSync(join(studentDirectory, 'token'), student, { mode: 0o600 });
    const runner = join(directory, 'npm');
    writeFileSync(
      runner,
      `#!${process.execPath}
const keys = ${JSON.stringify(databaseKeys)};
console.log(JSON.stringify({
  readonlyMatches: process.env.ADMIN_READONLY_COOKIE_VALUE === ${JSON.stringify(readonlyValue)},
  studentFresh: process.env.PROD_TEST_USER_COOKIE_VALUE === ${JSON.stringify(studentValue)},
  origin: process.env.PROD_URL,
  forbiddenKeys: keys.filter(key => Object.hasOwn(process.env, key)),
  args: process.argv.slice(2)
}));
process.exitCode = ${exitCode};
`,
    );
    chmodSync(runner, 0o700);
    return spawnSync('bash', ['-e', '-o', 'pipefail', '-c', smokeStep('smoke').run ?? ''], {
      encoding: 'utf8',
      timeout: HANDOFF_SPAWN_TIMEOUT_MS,
      env: {
        NODE_ENV: 'test',
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
  it(
    'reaches the database safety guard through the actual conditioned seed command',
    () => {
      const result = spawnSync('pnpm', ['run', 'seed:admin'], {
        encoding: 'utf8',
        timeout: SEED_ADMIN_SPAWN_TIMEOUT_MS,
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
    },
    SEED_ADMIN_TEST_TIMEOUT_MS,
  );

  it(
    'privately passes the readonly value without DB/signing credentials or token output',
    () => {
      const result = runHandoff(readonlyValue);
      expect(result.status, result.stderr).toBe(0);
      const lines = result.stdout.split('\n');
      expect(lines).toContain(`::add-mask::${studentValue}`);
      expect(lines).toContain(`::add-mask::${encodeURIComponent(studentValue)}`);
      expect(lines).toContain(`::add-mask::${readonlyValue}`);
      const publicOutput = lines.filter((line) => !line.startsWith('::add-mask::')).join('\n');
      expect(JSON.parse(publicOutput)).toEqual({
        readonlyMatches: true,
        studentFresh: true,
        origin: 'https://mirrorbuddy.vercel.app',
        forbiddenKeys: [],
        args: ['run', 'test:smoke:prod'],
      });
      expect(publicOutput + result.stderr).not.toContain(readonlyValue);
      expect(result.stdout + result.stderr).not.toContain('synthetic-student-value');
      expect(publicOutput + result.stderr).not.toContain(studentValue);
    },
    HANDOFF_TEST_TIMEOUT_MS,
  );

  it.each([null, '', 'legacy.signature', 'not-a-native-cookie\n'])(
    'rejects missing or invalid fresh student credentials: %j',
    (student) => {
      const result = runHandoff(readonlyValue, 0, student);
      expect(result.status).toBe(1);
      expect(result.stdout).toContain('Student smoke credential');
      expect(result.stdout).not.toContain('readonlyMatches');
    },
    HANDOFF_TEST_TIMEOUT_MS,
  );

  it.each([null, '', '\n', '   '])(
    'fails before starting smoke for unusable input %j',
    (token) => {
      const result = runHandoff(token);
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).toContain('Readonly smoke credential');
      expect(result.stdout).not.toContain('readonlyMatches');
    },
    HANDOFF_TEST_TIMEOUT_MS,
  );

  it(
    'preserves a failing browser exit instead of reporting success',
    () => {
      const result = runHandoff(readonlyValue, 7);
      expect(result.status).toBe(7);
    },
    HANDOFF_TEST_TIMEOUT_MS,
  );
});
