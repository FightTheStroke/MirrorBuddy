import 'server-only';
import type { Prisma } from '@prisma/client';
import { SessionReadError } from './session-policy';
import { requireUserId } from './session-transaction';

/** Shared write only; interactive or operator authorization belongs to the caller. */
export async function revokeNativeSessionRow(
  tx: Prisma.TransactionClient,
  userId: string,
  handleHash: string,
  now: Date,
): Promise<number> {
  requireUserId(userId);
  if (
    !tx ||
    typeof handleHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(handleHash) ||
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime())
  )
    throw new SessionReadError('INVALID_DATABASE_STATE');
  const result = await tx.authSession.updateMany({
    where: { userId, handleHash, revokedAt: null },
    data: { revokedAt: now },
  });
  if (result?.count !== 0 && result?.count !== 1)
    throw new SessionReadError('INVALID_DATABASE_STATE');
  return result.count;
}
