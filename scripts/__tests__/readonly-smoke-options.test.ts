// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readonlySmokeOptions, SmokeCommandError } from '../lib/readonly-smoke-options';

const directory = join(tmpdir(), 'readonly-smoke-unit');
const args = ['issue', '--target', 'synthetic', '--directory', directory];
const local = 'postgresql://fixture@127.0.0.1:5432/mirrorbuddy_remediation_47ba2c29';
const localEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: local,
  DIRECT_URL: local,
  SESSION_SECRET: 'synthetic-secret-not-an-operational-credential',
  ADMIN_READONLY_EMAIL: 'readonly@example.test',
} satisfies NodeJS.ProcessEnv;
const production = {
  ...localEnv,
  NODE_ENV: 'production',
  DATABASE_URL:
    'postgresql://postgres.example:synthetic-fixture-password@fixture-only.pooler.supabase.com:6543/postgres',
  DIRECT_URL:
    'postgresql://postgres:synthetic-fixture-password@db.example.supabase.co:5432/postgres',
  GITHUB_ACTIONS: 'true',
  GITHUB_EVENT_NAME: 'push',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_REPOSITORY: 'FightTheStroke/MirrorBuddy',
  GITHUB_WORKFLOW_REF: 'FightTheStroke/MirrorBuddy/.github/workflows/ci.yml@refs/heads/main',
  GITHUB_JOB: 'sync-admin-credentials',
  RUNNER_TEMP: tmpdir(),
} satisfies NodeJS.ProcessEnv;

describe('readonly smoke command boundary (pure validation, no database)', () => {
  it('accepts only the explicit synthetic target and fixed command shape', () => {
    expect(readonlySmokeOptions(args, localEnv, '24.19.0')).toEqual({
      action: 'issue',
      target: 'synthetic',
      directory,
      temporaryRoot: tmpdir(),
    });
    expect(readonlySmokeOptions(['revoke', ...args.slice(1)], localEnv, '24.19.0').action).toBe(
      'revoke',
    );
  });
  it('accepts the existing trusted main-push reconciliation context without executing it', () => {
    expect(
      readonlySmokeOptions(
        ['issue', '--target', 'production', '--directory', directory],
        production,
        '24.19.0',
      ).target,
    ).toBe('production');
  });
  it('supports the documented pooled connection flags without permitting target overrides', () => {
    expect(
      readonlySmokeOptions(
        ['issue', '--target', 'production', '--directory', directory],
        {
          ...production,
          DATABASE_URL: `${production.DATABASE_URL}?sslmode=require&pgbouncer=true`,
          DIRECT_URL: production.DATABASE_URL.replace(':6543/', ':5432/') + '?sslmode=require',
        },
        '24.19.0',
      ).target,
    ).toBe('production');
  });
  it.each([
    undefined,
    null,
    [],
    ['issue'],
    ['all', ...args.slice(1)],
    [...args, '--user', 'other'],
    [...args, '--lifetime', '86400'],
    [...args, '--role', 'ADMIN'],
    ['issue', '--target', 'production'],
    ['issue', '--target', 'synthetic', '--directory', 'relative'],
  ])('rejects missing or broader command authority %#', (input) => {
    expect(() => readonlySmokeOptions(input, localEnv, '24.19.0')).toThrow();
  });
  it.each<Partial<NodeJS.ProcessEnv>>([
    { DATABASE_URL: undefined },
    { DIRECT_URL: undefined },
    { SESSION_SECRET: '' },
    { ADMIN_READONLY_EMAIL: '' },
    { ADMIN_READONLY_EMAIL: 'not-email' },
    { E2E_TESTS: '1' },
    { NODE_ENV: 'production' },
    { DATABASE_URL: local.replace('127.0.0.1', 'localhost') },
    { DATABASE_URL: local.replace('47ba2c29', 'other') },
    { DATABASE_URL: `${local}?host=remote.example` },
    { DIRECT_URL: production.DIRECT_URL },
  ])('rejects missing inputs, target substitutions and overrides %#', (change) => {
    expect(() => readonlySmokeOptions(args, { ...localEnv, ...change }, '24.19.0')).toThrow();
  });
  it.each<Partial<NodeJS.ProcessEnv>>([
    { GITHUB_ACTIONS: '' },
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_REF: 'refs/heads/topic' },
    { GITHUB_REPOSITORY: 'other/repository' },
    { GITHUB_JOB: 'post-deploy-smoke' },
    {
      GITHUB_WORKFLOW_REF: 'FightTheStroke/MirrorBuddy/.github/workflows/other.yml@refs/heads/main',
    },
    { NODE_ENV: 'test' },
    { RUNNER_TEMP: '' },
    { DIRECT_URL: production.DIRECT_URL.replace('db.example', 'db.different') },
    { DATABASE_URL: production.DATABASE_URL.replace('supabase.com', 'supabase.com.attacker.test') },
    { DATABASE_URL: `${production.DATABASE_URL}?sslmode=require&sslmode=disable` },
    { DATABASE_URL: `${production.DATABASE_URL}?pgbouncer=true&host=remote.example` },
    { DATABASE_URL: `${production.DATABASE_URL}?pgbouncer=false` },
  ])('rejects untrusted production contexts and mismatched projects %#', (change) => {
    expect(() =>
      readonlySmokeOptions(
        ['issue', '--target', 'production', '--directory', directory],
        { ...production, ...change },
        '24.19.0',
      ),
    ).toThrow();
  });
  it.each(['26.0.0', '', '18.0.0'])('rejects unsupported Node %s', (version) => {
    expect(() => readonlySmokeOptions(args, localEnv, version)).toThrow();
  });

  it.each([
    [{ ADMIN_READONLY_EMAIL: 'private-invalid-email' }, 'ADMIN_READONLY_EMAIL'],
    [{ SESSION_SECRET: 'private-short-secret' }, 'SESSION_SECRET'],
    [{ E2E_TESTS: '1' }, 'E2E_TESTS'],
    [{ GITHUB_JOB: 'other-job' }, 'GITHUB_CONTEXT'],
    [{ RUNNER_TEMP: '' }, 'RUNNER_TEMP'],
    [{ DATABASE_URL: 'private-invalid-url' }, 'DATABASE_URL'],
    [{ DIRECT_URL: 'private-invalid-url' }, 'DIRECT_URL'],
    [
      { DIRECT_URL: production.DIRECT_URL.replace('db.example', 'db.different') },
      'PROJECT_MISMATCH',
    ],
  ] satisfies Array<[Partial<NodeJS.ProcessEnv>, string]>)(
    'identifies a rejected prerequisite without exposing its value %#',
    (change, reason) => {
      let failure: unknown;
      try {
        readonlySmokeOptions(
          ['issue', '--target', 'production', '--directory', directory],
          { ...production, ...change },
          '24.20.0',
        );
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(SmokeCommandError);
      expect(failure).toMatchObject({ code: 'INVALID_TARGET', reason });
      expect((failure as Error).message).toBe('INVALID_TARGET');
    },
  );
});
