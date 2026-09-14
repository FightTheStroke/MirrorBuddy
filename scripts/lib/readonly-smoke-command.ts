import { readonlySmokeOptions, SmokeCommandError } from './readonly-smoke-options';
import {
  privateSmokeDirectory,
  persistSmokeReceipt,
  publishSmokeToken,
  readSmokeReceipt,
  removeSmokeToken,
  finishSmokeCleanup,
} from './readonly-smoke-files';

function checkCancellation(signal?: AbortSignal) {
  if (signal?.aborted) throw new SmokeCommandError('CANCELLED');
}

export async function runReadonlySmokeCommand(args: unknown, signal?: AbortSignal): Promise<void> {
  if (signal !== undefined && !(signal instanceof AbortSignal))
    throw new SmokeCommandError('INVALID_ARGUMENTS');
  const options = readonlySmokeOptions(args, process.env, process.versions.node);
  checkCancellation(signal);
  const directory = await privateSmokeDirectory(options);
  let db: typeof import('../../apps/web/src/lib/db') | undefined;
  try {
    // No database module (including its pool) is loaded before target/file validation.
    db = await import('../../apps/web/src/lib/db');
    const service = await import('../../apps/web/src/lib/auth/readonly-smoke');
    if (options.action === 'issue') {
      let receipt: string | undefined;
      try {
        const issued = await service.issueReadonlySmokeSession(async (value) => {
          checkCancellation(signal);
          receipt = value;
          await persistSmokeReceipt(directory, value);
          checkCancellation(signal);
        });
        checkCancellation(signal);
        await publishSmokeToken(directory, issued.token);
        checkCancellation(signal);
      } catch (error) {
        try {
          await removeSmokeToken(directory);
        } finally {
          if (receipt) {
            try {
              await service.revokeReadonlySmokeSession(receipt);
            } catch {
              throw new SmokeCommandError('REVOCATION_FAILED');
            }
          }
        }
        throw error;
      }
    } else {
      const receipt = await readSmokeReceipt(directory);
      try {
        await removeSmokeToken(directory);
      } finally {
        await service.revokeReadonlySmokeSession(receipt);
      }
      await finishSmokeCleanup(directory);
      checkCancellation(signal);
    }
  } catch (error) {
    if (error instanceof SmokeCommandError) throw error;
    throw new SmokeCommandError(
      options.action === 'issue' ? 'ISSUANCE_FAILED' : 'REVOCATION_FAILED',
    );
  } finally {
    if (db) {
      const results = await Promise.allSettled([db.prisma.$disconnect(), db.dbPool.end()]);
      if (results.some((result) => result.status === 'rejected'))
        throw new SmokeCommandError('DISCONNECT_FAILED');
    }
  }
}
