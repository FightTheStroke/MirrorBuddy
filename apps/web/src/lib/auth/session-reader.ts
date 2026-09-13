import 'server-only';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedSession } from './session-auth';
import { parseSessionToken } from '@/lib/auth/session-token';
import {
  evaluateSessionPolicy,
  SessionReadError,
  type SessionResolution,
  type VerifiedCredential,
} from '@/lib/auth/session-policy';

/**
 * Standalone, read-only authorization. One statement observes state and database
 * time together; no cookies, upgrades, session creation or authorization cache.
 */
export async function resolveSessionToken(token: unknown): Promise<SessionResolution> {
  return resolveSessionTokenInTransaction(prisma, token);
}

export async function resolveSessionTokenInTransaction(
  tx: Prisma.TransactionClient,
  token: unknown,
): Promise<SessionResolution> {
  const credential = parseSessionToken(token);
  if (!credential.valid) return { status: 'DENIED', reason: 'INVALID_TOKEN' };
  return readCredential(tx, credential);
}

export async function revalidateSession(
  tx: Prisma.TransactionClient,
  session: AuthenticatedSession | null | undefined,
): Promise<SessionResolution> {
  if (!session?.userId || !session.session || !Number.isInteger(session.userAuthVersion))
    throw new TypeError('Authorized session reference is required');
  const credential: VerifiedCredential =
    session.session.kind === 'legacy'
      ? { valid: true, kind: 'legacy', userId: session.userId, legacyOrigin: true }
      : { valid: true, kind: 'modern', handleHash: session.session.handleHash };
  const result = await readCredential(tx, credential);
  if (
    result.status === 'AUTHENTICATED' &&
    (result.userId !== session.userId || result.userAuthVersion !== session.userAuthVersion)
  )
    return { status: 'DENIED', reason: 'VERSION_MISMATCH' };
  return result;
}

async function readCredential(
  client: Pick<Prisma.TransactionClient, '$queryRaw'>,
  credential: VerifiedCredential,
): Promise<SessionResolution> {
  const modern = credential.kind === 'modern';
  const handleHash = credential.kind === 'modern' ? credential.handleHash : null;
  const legacyUserId = credential.kind === 'legacy' ? credential.userId : null;
  let rows: unknown;
  try {
    rows = await client.$queryRaw`
      SELECT statement_timestamp() AS "dbNow",
        g."id" AS "activationId", g."sessionActivatedAt",
        u."id" AS "userId", u."disabled" AS "userDisabled",
        u."authVersion" AS "userAuthVersion", u."legacyRevoked" AS "userLegacyRevoked",
        s."handleHash", s."userId" AS "sessionUserId", s."issuedAt", s."expiresAt",
        s."revokedAt", s."authVersion" AS "sessionAuthVersion", s."legacyOrigin"
      FROM (VALUES (1)) AS anchor(n)
      LEFT JOIN "AuthSession" s ON s."handleHash" = ${handleHash}
      LEFT JOIN "User" u ON u."id" =
        CASE WHEN ${modern} THEN s."userId" ELSE ${legacyUserId} END
      LEFT JOIN "GlobalConfig" g ON g."id" = 'global'
    `;
  } catch (cause: unknown) {
    throw new SessionReadError('DATABASE_FAILURE', cause);
  }
  if (!Array.isArray(rows) || rows.length !== 1)
    throw new SessionReadError('INVALID_DATABASE_STATE');
  return evaluateSessionPolicy(credential, rows[0]);
}
