import { assertAuthRecoveryTarget } from './auth-recovery-target';
import { RecoveryError, recoveryFailure } from './readonly-recovery-diagnostics';

export async function runReadonlyRecovery(args: unknown, env: NodeJS.ProcessEnv) {
  assertAuthRecoveryTarget(env, 'readonly-recovery');
  const { prisma, dbPool } = await import('../../apps/web/src/lib/db').catch(() => {
    throw new RecoveryError('DB_IMPORT_FAILED');
  });
  try {
    const { recoverReadonlyAccount, recoveryAction } = await import('./seed-admin-recovery').catch(
      () => {
        throw new RecoveryError('DB_IMPORT_FAILED');
      },
    );
    return await recoverReadonlyAccount(recoveryAction(args), env);
  } catch (error) {
    throw new RecoveryError(recoveryFailure(error, 'DB_OPERATION_FAILED'));
  } finally {
    const results = await Promise.allSettled([
      Promise.resolve().then(() => prisma.$disconnect()),
      Promise.resolve().then(() => dbPool.end()),
    ]);
    if (results.some((result) => result.status === 'rejected'))
      throw new RecoveryError('DISCONNECT_FAILED');
  }
}
