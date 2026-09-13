import 'server-only';
import type { Prisma } from '@prisma/client';
import { ApiError } from '@/lib/api/pipe';
import { revalidateSession } from './session-reader';
import type { AuthenticatedSession } from './session-auth';
import { insertSession } from './session-issuance';
import { revokeNativeSessionRow } from './session-row-revocation';
import { SESSION_MAX_AGE } from './cookie-constants';
import {
  sessionTransaction,
  sessionDatabaseNow,
  requireActiveSession,
  requireUserId,
  assertAdminSession,
} from './session-transaction';

type AccountChange = { passwordHash?: string; mustChangePassword?: boolean; disabled?: boolean };

export async function invalidateAllSessions(
  tx: Prisma.TransactionClient,
  userId: string,
  now: Date,
  change: AccountChange = {},
) {
  requireUserId(userId);
  const user = await tx.user.update({
    where: { id: userId },
    data: { ...change, authVersion: { increment: 1 }, legacyRevoked: true },
  });
  await tx.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now },
  });
  return user;
}

export async function revokeSession(
  reference: AuthenticatedSession | null | undefined,
  scope: 'current' | 'all',
): Promise<void> {
  if (scope !== 'current' && scope !== 'all') throw new ApiError('Invalid logout scope', 400);
  await sessionTransaction(async (tx) => {
    const result = await revalidateSession(tx, reference);
    // A concurrent identical current logout is harmless; it cannot affect newer sessions.
    if (
      scope === 'current' &&
      result.status === 'DENIED' &&
      (result.reason === 'SESSION_REVOKED' || result.reason === 'LEGACY_REVOKED')
    ) {
      const owner = await tx.user.findUnique({
        where: { id: reference?.userId },
        select: { authVersion: true },
      });
      if (owner && owner.authVersion === reference?.userAuthVersion) return;
    }
    const auth = requireActiveSession(result);
    const now = await sessionDatabaseNow(tx);
    if (scope === 'all') {
      await invalidateAllSessions(tx, auth.userId, now);
    } else if (auth.session.legacyOrigin) {
      await tx.user.update({ where: { id: auth.userId }, data: { legacyRevoked: true } });
      await tx.authSession.updateMany({
        where: { userId: auth.userId, legacyOrigin: true, revokedAt: null },
        data: { revokedAt: now },
      });
    } else if (auth.session.kind === 'modern') {
      await revokeNativeSessionRow(tx, auth.userId, auth.session.handleHash, now);
    }
  });
}

export async function changeSessionPassword(
  reference: AuthenticatedSession | null | undefined,
  expectedHash: string | null | undefined,
  passwordHash: string | null | undefined,
) {
  if (!expectedHash || !passwordHash) throw new ApiError('Password proof is required', 400);
  return sessionTransaction(async (tx) => {
    const auth = requireActiveSession(await revalidateSession(tx, reference));
    const previous = await tx.user.findUnique({ where: { id: auth.userId } });
    if (!previous || previous.passwordHash !== expectedHash)
      throw new ApiError('Credentials changed; authenticate again', 409);
    const user = await invalidateAllSessions(tx, auth.userId, await sessionDatabaseNow(tx), {
      passwordHash,
      mustChangePassword: false,
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });
    return insertSession(tx, user, SESSION_MAX_AGE);
  });
}

export async function resetUserPassword(
  userId: string | null | undefined,
  passwordHash: string | null | undefined,
  mustChangePassword = false,
  actor?: AuthenticatedSession,
): Promise<void> {
  requireUserId(userId);
  if (!passwordHash) throw new ApiError('Password hash is required', 400);
  await sessionTransaction(async (tx) => {
    if (actor !== undefined) await assertAdminSession(tx, actor);
    await invalidateAllSessions(tx, userId, await sessionDatabaseNow(tx), {
      passwordHash,
      mustChangePassword,
    });
    await tx.passwordResetToken.updateMany({
      where: { userId, used: false },
      data: { used: true },
    });
  });
}

export async function consumePasswordReset(
  token: string | null | undefined,
  passwordHash: string | null | undefined,
): Promise<void> {
  if (!token || !passwordHash) throw new ApiError('Reset token and password are required', 400);
  await sessionTransaction(async (tx) => {
    const now = await sessionDatabaseNow(tx);
    const reset = await tx.passwordResetToken.findUnique({ where: { token } });
    if (!reset || reset.used || reset.expiresAt <= now)
      throw new ApiError('Invalid or expired token', 400);
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: reset.id, used: false, expiresAt: { gt: now } },
      data: { used: true },
    });
    if (consumed.count !== 1) throw new ApiError('Invalid or expired token', 400);
    await invalidateAllSessions(tx, reset.userId, now, { passwordHash, mustChangePassword: false });
    await tx.passwordResetToken.updateMany({
      where: { userId: reset.userId, used: false },
      data: { used: true },
    });
  });
}

export async function setUserDisabled(
  userId: string | null | undefined,
  disabled: boolean,
  actor?: AuthenticatedSession,
) {
  requireUserId(userId);
  if (typeof disabled !== 'boolean') throw new ApiError('Disabled state is required', 400);
  return sessionTransaction(async (tx) => {
    if (actor !== undefined) await assertAdminSession(tx, actor);
    return disabled
      ? invalidateAllSessions(tx, userId, await sessionDatabaseNow(tx), { disabled: true })
      : tx.user.update({ where: { id: userId }, data: { disabled: false } });
  });
}
