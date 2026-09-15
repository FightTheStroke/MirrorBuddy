import { assertAuthRecoveryTarget } from './lib/auth-recovery-target';

async function main() {
  assertAuthRecoveryTarget(process.env, 'readonly-recovery');
  const { recoverReadonlyAccount, recoveryAction } = await import('./lib/seed-admin-recovery');
  const { prisma, dbPool } = await import('../apps/web/src/lib/db');
  try {
    const action = recoveryAction(process.argv.slice(2));
    const status = await recoverReadonlyAccount(action, process.env);
    console.log(`READONLY_RECOVERY_${status}`);
  } finally {
    const results = await Promise.allSettled([prisma.$disconnect(), dbPool.end()]);
    if (results.some((result) => result.status === 'rejected'))
      throw new Error('RECOVERY_DISCONNECT_FAILED');
  }
}

main().catch(() => {
  console.error('READONLY_RECOVERY_FAILED');
  process.exitCode = 1;
});
