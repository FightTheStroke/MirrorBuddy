// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import bcrypt from 'bcrypt';
import { parse } from 'yaml';
import { expect, it } from 'vitest';

const workflow = parse(
  readFileSync(resolve(__dirname, '../../.github/workflows/readonly-recovery.yml'), 'utf8'),
);
const workflowRun = workflow.jobs.recover.steps.at(-1).run;

function runtimeEnvironment(mode: string): NodeJS.ProcessEnv {
  return {
    HOME: process.env.HOME,
    PATH: process.env.PATH,
    NODE_OPTIONS: `--import=${resolve(__dirname, 'readonly-recovery-runtime-fixture.mjs')}`,
    NODE_ENV: 'production',
    GITHUB_ACTIONS: 'true',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_REPOSITORY: 'FightTheStroke/MirrorBuddy',
    GITHUB_WORKFLOW_REF:
      'FightTheStroke/MirrorBuddy/.github/workflows/readonly-recovery.yml@refs/heads/main',
    GITHUB_JOB: 'recover',
    PRODUCTION_DB_ID: 'fixture',
    DATABASE_URL:
      'postgresql://postgres:synthetic-dummy-password@db.fixture.supabase.co:5432/postgres',
    DIRECT_URL:
      'postgresql://postgres:synthetic-dummy-password@db.fixture.supabase.co:5432/postgres',
    PII_ENCRYPTION_KEY: 'a'.repeat(64),
    ADMIN_EMAIL: 'owner@example.test',
    ADMIN_PASSWORD: mode === 'config-failure' ? '' : 'synthetic-owner-password',
    ADMIN_READONLY_EMAIL: 'readonly@example.test',
    RECOVERY_FIXTURE_MODE: mode,
    RECOVERY_FIXTURE_HASH: bcrypt.hashSync('synthetic-owner-password', 4),
    ACTION: 'report',
    CONFIRM: '',
  };
}

const scenarios = [
  ['report', 'CONVERSION_REQUIRED', 0],
  ['import-failure', 'DB_IMPORT_FAILED', 1],
  ['owner-rejected', 'OWNER_REJECTED', 1],
  ['account-rejected', 'ACCOUNT_REJECTED', 1],
  ['operation-failure', 'DB_OPERATION_FAILED', 1],
  ['disconnect-failure', 'DISCONNECT_FAILED', 1],
  ['config-failure', 'CONFIG_ADMIN_PASSWORD', 1],
] as const;

it.each(scenarios)(
  'conditioned pnpm launcher reaches real runtime imports: %s',
  (mode, code, exit) => {
    const result = spawnSync(
      'pnpm',
      ['run', 'script', '--', 'scripts/readonly-recovery.ts', 'report'],
      {
        cwd: resolve(__dirname, '../..'),
        encoding: 'utf8',
        timeout: 30_000,
        env: runtimeEnvironment(mode),
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.stdout + result.stderr).not.toMatch(
      /synthetic-private-import-canary|synthetic-owner-password|synthetic-dummy-password/,
    );
    expect(result.status, result.stdout + result.stderr).toBe(exit);
    const statuses = (result.stdout + result.stderr)
      .split('\n')
      .filter((line) => line.startsWith('READONLY_RECOVERY_'));
    expect(statuses).toEqual([`READONLY_RECOVERY_${code}`]);
    const phases = result.stderr;
    expect(phases).toContain('PRISMA_IMPORT');
    expect(phases).not.toContain('NETWORK_BLOCKED');
    if (mode !== 'import-failure') {
      expect(phases).toContain('DISCONNECT');
    }
    if (mode === 'import-failure' || mode === 'config-failure') {
      expect(phases).not.toContain('TRANSACTION');
    } else {
      expect(phases).toContain('TRANSACTION');
    }
  },
  35_000,
);

it.each(scenarios)(
  'actual workflow Bash invokes actual conditioned pnpm with isolated boundaries: %s',
  (mode, code, exit) => {
    const result = spawnSync(
      'bash',
      ['--noprofile', '--norc', '-euo', 'pipefail', '-c', workflowRun],
      {
        cwd: resolve(__dirname, '../..'),
        encoding: 'utf8',
        timeout: 30_000,
        env: runtimeEnvironment(mode),
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(exit);
    expect(result.stdout).toBe(`${exit === 0 ? '' : '::error::'}READONLY_RECOVERY_${code}\n`);
    expect(result.stderr).toBe('');
  },
  35_000,
);
