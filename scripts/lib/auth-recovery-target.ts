import { assertProductionAuthDatabase } from './readonly-smoke-options';

export function assertAuthRecoveryContext(
  env: NodeJS.ProcessEnv,
  workflow: 'readonly-recovery' | 'student-smoke',
): void {
  if (!env || !['readonly-recovery', 'student-smoke'].includes(workflow))
    throw new Error('AUTH_TARGET_REJECTED');
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
  if (
    env.E2E_TESTS === '1' ||
    Object.entries(trusted).some(([key, value]) => env[key] !== value) ||
    !/^24\./.test(process.versions.node)
  )
    throw new Error('AUTH_TARGET_REJECTED');
}

export function assertAuthRecoveryTarget(
  env: NodeJS.ProcessEnv,
  workflow: 'readonly-recovery' | 'student-smoke',
): void {
  assertAuthRecoveryContext(env, workflow);
  assertProductionAuthDatabase(env);
}
