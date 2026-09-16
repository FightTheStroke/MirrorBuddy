import { basename } from 'node:path';
import { z } from 'zod';
import { assertAuthRecoveryContext, assertAuthRecoveryTarget } from './auth-recovery-target';
import { privateSmokeDirectory } from './readonly-smoke-files';
import { cleanupStudentReceipt, studentReceipt } from './student-smoke-files';
import { loginStudent, preflightStudent, studentIdentity } from './student-smoke-login';

export async function runStudentSmokeCommand(args: unknown, signal?: AbortSignal): Promise<void> {
  let db: typeof import('../../apps/web/src/lib/db') | undefined;
  try {
    const [action, , requested] = z
      .tuple([z.enum(['issue', 'revoke']), z.literal('--directory'), z.string().min(1)])
      .parse(args);
    assertAuthRecoveryContext(process.env, 'student-smoke');
    if (signal !== undefined && !(signal instanceof AbortSignal))
      throw new Error('STUDENT_ARGUMENTS_REJECTED');
    if (
      basename(requested) !==
        `readonly-smoke-student-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}` ||
      !/^\d+$/.test(process.env.GITHUB_RUN_ID ?? '') ||
      !/^\d+$/.test(process.env.GITHUB_RUN_ATTEMPT ?? '')
    )
      throw new Error('STUDENT_DIRECTORY_REJECTED');
    const directory = await privateSmokeDirectory({
      action,
      target: 'production',
      directory: requested,
      temporaryRoot: process.env.RUNNER_TEMP ?? '',
    });
    if (action === 'revoke') {
      await cleanupStudentReceipt(directory);
      return;
    }
    const receipt = await studentReceipt(directory);
    assertAuthRecoveryTarget(process.env, 'student-smoke');
    const identity = studentIdentity(process.env);
    db = await import('../../apps/web/src/lib/db');
    await preflightStudent(db.prisma.user, identity);
    if (signal?.aborted) throw new Error('STUDENT_CANCELLED');
    await loginStudent(identity, receipt);
    if (signal?.aborted) {
      await cleanupStudentReceipt(directory);
      throw new Error('STUDENT_CANCELLED');
    }
  } catch {
    throw new Error('STUDENT_SMOKE_FAILED');
  } finally {
    if (db) {
      const results = await Promise.allSettled([db.prisma.$disconnect(), db.dbPool.end()]);
      if (results.some((result) => result.status === 'rejected'))
        throw new Error('STUDENT_DISCONNECT_FAILED');
    }
  }
}
