// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { assertAuthRecoveryContext, assertAuthRecoveryTarget } from '../lib/auth-recovery-target';
import { recoveryFailure } from '../lib/readonly-recovery-diagnostics';

const env = {
  NODE_ENV: 'production',
  GITHUB_ACTIONS: 'true',
  GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_REPOSITORY: 'FightTheStroke/MirrorBuddy',
  GITHUB_WORKFLOW_REF:
    'FightTheStroke/MirrorBuddy/.github/workflows/readonly-recovery.yml@refs/heads/main',
  GITHUB_JOB: 'recover',
  PRODUCTION_DB_ID: 'fixture',
  DATABASE_URL: 'postgresql://postgres:synthetic@db.fixture.supabase.co:5432/postgres',
  DIRECT_URL: 'postgresql://postgres:synthetic@db.fixture.supabase.co:5432/postgres',
} satisfies NodeJS.ProcessEnv;
describe('fixed auth recovery authority', () => {
  it.each([
    ['DATABASE_URL', '', 'TARGET_DATABASE_URL'],
    ['DIRECT_URL', 'secret-invalid-url', 'TARGET_DIRECT_URL'],
    ['PRODUCTION_DB_ID', '', 'TARGET_PRODUCTION_DB_ID'],
    ['PRODUCTION_DB_ID', 'different', 'TARGET_PROJECT_MISMATCH'],
    ['GITHUB_JOB', 'other', 'TARGET_GITHUB_CONTEXT'],
    ['E2E_TESTS', '1', 'TARGET_E2E_TESTS'],
  ])('reports a fixed prerequisite without the rejected %s value', (key, value, code) => {
    let failure: unknown;
    try {
      assertAuthRecoveryTarget({ ...env, [key]: value }, 'readonly-recovery');
    } catch (error) {
      failure = error;
    }
    expect(recoveryFailure(failure)).toBe(code);
  });
  it.each([null, undefined])('rejects absent context %j', (value) => {
    expect(() => assertAuthRecoveryTarget(value, 'readonly-recovery')).toThrow(
      /^TARGET_GITHUB_CONTEXT$/,
    );
  });
  it('accepts only the protected manual source for readonly conversion', () => {
    expect(() => assertAuthRecoveryTarget(env, 'readonly-recovery')).not.toThrow();
    expect(() => assertAuthRecoveryTarget(env, 'student-smoke')).toThrow();
  });
  it.each(Object.keys(env))('rejects missing or changed %s', (key) => {
    expect(() => assertAuthRecoveryTarget({ ...env, [key]: '' }, 'readonly-recovery')).toThrow();
    expect(() =>
      assertAuthRecoveryTarget({ ...env, [key]: 'other' }, 'readonly-recovery'),
    ).toThrow();
  });
  it('rejects mismatched production projects and E2E overrides', () => {
    expect(() =>
      assertAuthRecoveryTarget(
        {
          ...env,
          PRODUCTION_DB_ID: 'different',
        },
        'readonly-recovery',
      ),
    ).toThrow();
    expect(() =>
      assertAuthRecoveryTarget(
        {
          ...env,
          DIRECT_URL: 'postgresql://postgres:synthetic@db.other.supabase.co:5432/postgres',
        },
        'readonly-recovery',
      ),
    ).toThrow();
    expect(() =>
      assertAuthRecoveryContext({ ...env, E2E_TESTS: '1' }, 'readonly-recovery'),
    ).toThrow();
  });
  it('allows student logout without DB/password/signing authority, only in trusted CI', () => {
    const student = {
      ...env,
      DATABASE_URL: undefined,
      DIRECT_URL: undefined,
      GITHUB_EVENT_NAME: 'push',
      GITHUB_JOB: 'sync-admin-credentials',
      GITHUB_WORKFLOW_REF: 'FightTheStroke/MirrorBuddy/.github/workflows/ci.yml@refs/heads/main',
    };
    expect(() => assertAuthRecoveryContext(student, 'student-smoke')).not.toThrow();
    expect(() => assertAuthRecoveryTarget(student, 'student-smoke')).toThrow();
    expect(() =>
      assertAuthRecoveryContext({ ...student, GITHUB_REF: 'refs/heads/feature' }, 'student-smoke'),
    ).toThrow();
  });
});
