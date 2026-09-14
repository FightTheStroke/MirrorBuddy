import 'server-only';
import type { Prisma } from '@prisma/client';
import { ApiError } from '@/lib/api/pipe';
import { SessionReadError } from './session-policy';
import { createSessionToken } from './session-token';
import { revalidateSession, resolveSessionTokenInTransaction } from './session-reader';
import type { AuthenticatedSession } from './session-auth';
import { SESSION_MAX_AGE, GUEST_SESSION_MAX_AGE } from './cookie-constants';
import {
  sessionTransaction,
  sessionDatabaseNow,
  requireActiveSession,
  requireUserId,
} from './session-transaction';

export interface IssuedSession {
  token: string;
  handleHash: string;
  userId: string;
  issuedAt: Date;
  expiresAt: Date;
  maxAge: number;
}

/** Internal transaction primitive. Never update or reuse an existing session's handle. */
export async function insertSession(
  tx: Prisma.TransactionClient,
  user: { id: string; authVersion: number; disabled: boolean },
  lifetime: number,
  legacyDeadline?: Date,
): Promise<IssuedSession> {
  requireUserId(user?.id);
  if (
    typeof user.disabled !== 'boolean' ||
    !Number.isInteger(user.authVersion) ||
    user.authVersion < 0 ||
    user.authVersion > 2_147_483_647
  )
    throw new SessionReadError('INVALID_DATABASE_STATE');
  if (user.disabled) throw new ApiError('Account cannot issue a session', 401);
  if (!Number.isSafeInteger(lifetime) || lifetime <= 0)
    throw new TypeError('A positive session lifetime is required');
  const issuedAt = await sessionDatabaseNow(tx);
  const expiresAt = legacyDeadline ?? new Date(issuedAt.getTime() + lifetime * 1000);
  const maxAge = Math.floor((expiresAt.getTime() - issuedAt.getTime()) / 1000);
  if (!Number.isFinite(maxAge) || maxAge <= 0) throw new ApiError('Session has expired', 401);
  const created = createSessionToken();
  await tx.authSession.create({
    data: {
      handleHash: created.handleHash,
      userId: user.id,
      issuedAt,
      expiresAt,
      authVersion: user.authVersion,
      legacyOrigin: legacyDeadline !== undefined,
    },
  });
  return { ...created, userId: user.id, issuedAt, expiresAt, maxAge };
}

export async function issuePasswordSession(
  userId: string | null | undefined,
  proof: { passwordHash: string; authVersion: number } | null | undefined,
  previousToken?: string,
): Promise<IssuedSession> {
  requireUserId(userId);
  if (!proof?.passwordHash || !Number.isInteger(proof.authVersion))
    throw new ApiError('Credential proof is required', 401);
  return sessionTransaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.passwordHash !== proof.passwordHash || user.authVersion !== proof.authVersion)
      throw new ApiError('Credentials changed; authenticate again', 409);
    if (previousToken !== undefined) {
      const previous = await resolveSessionTokenInTransaction(tx, previousToken);
      if (
        previous.status === 'AUTHENTICATED' &&
        previous.userId === userId &&
        previous.session.kind === 'modern'
      ) {
        await tx.authSession.updateMany({
          where: { userId, handleHash: previous.session.handleHash, revokedAt: null },
          data: { revokedAt: await sessionDatabaseNow(tx) },
        });
      }
    }
    return insertSession(tx, user, SESSION_MAX_AGE);
  });
}

export async function createGuestSession(data: Prisma.UserCreateInput) {
  if (!data || typeof data !== 'object') throw new TypeError('Guest creation data is required');
  return sessionTransaction(async (tx) => {
    const user = await tx.user.create({ data });
    const issued = await insertSession(tx, user, GUEST_SESSION_MAX_AGE);
    return { user, issued };
  });
}

export async function upgradeLegacySession(
  reference: AuthenticatedSession | null | undefined,
): Promise<{ upgraded: false } | { upgraded: true; issued: IssuedSession }> {
  return sessionTransaction(async (tx) => {
    const session = requireActiveSession(await revalidateSession(tx, reference));
    if (session.session.kind === 'modern') return { upgraded: false };
    const issued = await insertSession(
      tx,
      {
        id: session.userId,
        authVersion: session.userAuthVersion,
        disabled: false,
      },
      SESSION_MAX_AGE,
      session.validUntil,
    );
    return { upgraded: true, issued };
  });
}
