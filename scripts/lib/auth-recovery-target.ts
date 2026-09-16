import { assertProductionAuthDatabase, SmokeCommandError } from './readonly-smoke-options';
import { RecoveryError } from './readonly-recovery-diagnostics';

export function assertAuthRecoveryContext(
  env: NodeJS.ProcessEnv | null | undefined,
  workflow: 'readonly-recovery' | 'student-smoke',
): asserts env is NodeJS.ProcessEnv {
  if (!env || !['readonly-recovery', 'student-smoke'].includes(workflow))
    throw new RecoveryError('TARGET_GITHUB_CONTEXT');
  if (!/^24\./.test(process.versions.node)) throw new RecoveryError('TARGET_NODE_VERSION');
  if (env.E2E_TESTS === '1') throw new RecoveryError('TARGET_E2E_TESTS');
  const manual = workflow === 'readonly-recovery';
  const trusted = {
    NODE_ENV: 'production',
    GITHUB_ACTIONS: 'true',
    GITHUB_EVENT_NAME: manual ? 'workflow_dispatch' : 'push',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_REPOSITORY: 'FightTheStroke/MirrorBuddy',
    GITHUB_WORKFLOW_REF: manual
      ? 'FightTheStroke/MirrorBuddy/.github/workflows/readonly-recovery.yml@refs/heads/main'
      : 'FightTheStroke/MirrorBuddy/.github/workflows/ci.yml@refs/heads/main',
    GITHUB_JOB: manual ? 'recover' : 'sync-admin-credentials',
  };
  if (Object.entries(trusted).some(([key, value]) => env[key] !== value))
    throw new RecoveryError('TARGET_GITHUB_CONTEXT');
}

export function assertAuthRecoveryTarget(
  env: NodeJS.ProcessEnv | null | undefined,
  workflow: 'readonly-recovery' | 'student-smoke',
): void {
  assertAuthRecoveryContext(env, workflow);
  if (!env.PRODUCTION_DB_ID) throw new RecoveryError('TARGET_PRODUCTION_DB_ID');
  try {
    assertProductionAuthDatabase(env);
  } catch (error) {
    if (error instanceof SmokeCommandError) {
      if (error.reason === 'DATABASE_URL') throw new RecoveryError('TARGET_DATABASE_URL');
      if (error.reason === 'DIRECT_URL') throw new RecoveryError('TARGET_DIRECT_URL');
      if (error.reason === 'PROJECT_MISMATCH') throw new RecoveryError('TARGET_PROJECT_MISMATCH');
    }
    throw new RecoveryError('TARGET_GITHUB_CONTEXT');
  }
}
