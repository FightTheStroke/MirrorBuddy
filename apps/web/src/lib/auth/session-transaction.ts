import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/api/pipe';
import { SessionReadError, type SessionResolution } from './session-policy';
import type { AuthenticatedSession } from './session-auth';
import { AuthenticationError } from './auth-error';
import { revalidateSession } from './session-reader';

function driverAdapterConflict(cause: unknown): boolean {
  if (typeof cause !== 'object' || cause === null) return false;
  if (!('name' in cause) || cause.name !== 'DriverAdapterError' || !('cause' in cause))
    return false;
  const detail = cause.cause;
  return (
    typeof detail === 'object' &&
    detail !== null &&
    'kind' in detail &&
    detail.kind === 'TransactionWriteConflict' &&
    'originalCode' in detail &&
    (detail.originalCode === '40001' || detail.originalCode === '40P01')
  );
}

function serializationConflict(error: unknown): boolean {
  const cause = error instanceof SessionReadError ? error.cause : error;
  if (typeof cause !== 'object' || cause === null) return false;
  if ('code' in cause && cause.code === 'P2034') return true;
  if (driverAdapterConflict(cause)) return true;
  if (!('code' in cause) || cause.code !== 'P2010' || !('meta' in cause)) return false;
  const meta = cause.meta;
  return (
    typeof meta === 'object' &&
    meta !== null &&
    'driverAdapterError' in meta &&
    driverAdapterConflict(meta.driverAdapterError)
  );
}

/** Serializable retries re-run proof and revocation checks, never just the write. */
export async function sessionTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (typeof work !== 'function') throw new TypeError('Transaction operation is required');
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: 'Serializable',
        maxWait: 5_000,
        timeout: 10_000,
      });
    } catch (error) {
      if (attempt < 2 && serializationConflict(error)) continue;
      throw error;
    }
  }
}

export async function sessionDatabaseNow(tx: Prisma.TransactionClient): Promise<Date> {
  const rows = await tx.$queryRaw<Array<{ now: Date }>>`SELECT statement_timestamp() AS now`;
  const now = rows?.[0]?.now;
  if (rows?.length !== 1 || !(now instanceof Date) || !Number.isFinite(now.getTime()))
    throw new SessionReadError('INVALID_DATABASE_STATE');
  return now;
}

export function requireActiveSession(
  result: SessionResolution | null | undefined,
): AuthenticatedSession {
  if (result?.status === 'AUTHENTICATED') return result;
  if (result?.status === 'NOT_ACTIVATED') throw new AuthenticationError('SESSION_NOT_ACTIVATED');
  throw new AuthenticationError('SESSION_REJECTED');
}

export async function assertAdminSession(
  tx: Prisma.TransactionClient,
  reference: AuthenticatedSession,
): Promise<void> {
  const actor = requireActiveSession(await revalidateSession(tx, reference));
  const user = await tx.user.findUnique({ where: { id: actor.userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') throw new ApiError('Administrative session required', 403);
}

export function requireUserId(userId: unknown): asserts userId is string {
  if (typeof userId !== 'string' || userId.length === 0)
    throw new ApiError('User identity is required', 400);
}
