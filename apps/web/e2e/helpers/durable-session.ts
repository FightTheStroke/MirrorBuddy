import type { PrismaClient } from '@prisma/client';
import { createFixtureToken } from './session-token-factory';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_CLIENT } from '../../src/lib/auth/cookie-constants';

export const FIXTURE_SESSION_SECONDS = 24 * 60 * 60;

/** Native E2E credentials are usable only after a real test owner's row is committed. */
export async function issueTestSession(
  prisma: PrismaClient,
  userId: string,
  lifetime = FIXTURE_SESSION_SECONDS,
) {
  if (
    !prisma ||
    typeof userId !== 'string' ||
    !userId ||
    !Number.isSafeInteger(lifetime) ||
    lifetime <= 0 ||
    lifetime > FIXTURE_SESSION_SECONDS
  ) {
    throw new TypeError('A test owner and bounded fixture lifetime are required');
  }
  // The owner and the database clock are validated first, so an invalid owner
  // never reaches token minting. Minting then happens outside any transaction:
  // it spawns a subprocess that took seconds, which blew the Serializable
  // transaction's 5s timeout and made every session-backed fixture flaky.
  const verified = await prisma.$transaction(
    async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, disabled: true, authVersion: true, isTestData: true },
      });
      if (
        !user ||
        user.id !== userId ||
        user.disabled !== false ||
        user.isTestData !== true ||
        !Number.isInteger(user.authVersion) ||
        user.authVersion < 0 ||
        user.authVersion > 2147483647
      ) {
        throw new Error('An enabled real test owner with an integer authVersion is required');
      }
      const rows = await tx.$queryRaw<Array<{ now: Date }>>`SELECT statement_timestamp() AS now`;
      const issuedAt = rows?.[0]?.now;
      if (
        rows?.length !== 1 ||
        !(issuedAt instanceof Date) ||
        !Number.isFinite(issuedAt.getTime())
      ) {
        throw new Error('A valid database clock is required for fixture issuance');
      }
      return { userId: user.id, authVersion: user.authVersion, issuedAt };
    },
    { isolationLevel: 'Serializable' },
  );
  const expiresAt = new Date(verified.issuedAt.getTime() + lifetime * 1000);
  const created = await createFixtureToken();
  return prisma.$transaction(
    async (tx) => {
      await tx.authSession.create({
        data: {
          handleHash: created.handleHash,
          userId: verified.userId,
          issuedAt: verified.issuedAt,
          expiresAt,
          authVersion: verified.authVersion,
          legacyOrigin: false,
        },
      });
      return { ...created, userId: verified.userId, issuedAt: verified.issuedAt, expiresAt };
    },
    { isolationLevel: 'Serializable' },
  );
}

export function testSessionCookies(
  session: Awaited<ReturnType<typeof issueTestSession>>,
  origin = 'http://localhost:3000',
) {
  if (!session?.token || !session.userId || !(session.expiresAt instanceof Date))
    throw new TypeError('A persisted test session is required');
  const url = new URL(origin);
  const attributes = {
    domain: url.hostname,
    path: '/',
    expires: Math.floor(session.expiresAt.getTime() / 1000),
    secure: url.protocol === 'https:',
    sameSite: 'Lax' as const,
  };
  return [
    { ...attributes, name: AUTH_COOKIE_NAME, value: session.token, httpOnly: true },
    { ...attributes, name: AUTH_COOKIE_CLIENT, value: session.userId, httpOnly: false },
  ];
}
