import 'server-only';
import { prisma } from '@/lib/db';
import { parseSessionToken } from '@/lib/auth/session-token';
import {
  evaluateSessionPolicy,
  SessionReadError,
  type SessionResolution,
} from '@/lib/auth/session-policy';

/**
 * Standalone, read-only authorization. One statement observes state and database
 * time together; no cookies, upgrades, session creation or authorization cache.
 */
export async function resolveSessionToken(token: unknown): Promise<SessionResolution> {
  const credential = parseSessionToken(token);
  if (!credential.valid) return { status: 'DENIED', reason: 'INVALID_TOKEN' };
  const modern = credential.kind === 'modern';
  const handleHash = credential.kind === 'modern' ? credential.handleHash : null;
  const legacyUserId = credential.kind === 'legacy' ? credential.userId : null;
  let rows: unknown;
  try {
    rows = await prisma.$queryRaw`
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
