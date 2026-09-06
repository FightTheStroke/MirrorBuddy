import { vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type { AuthResult, AuthenticatedSession } from '@/lib/auth/server';
import { signedSessionCredential } from './session-credentials';
import { snapshot } from './session-lifecycle';

export function nativeSessionFixture(userId = 'session-owner') {
  const issued = signedSessionCredential();
  const row = snapshot({
    userId,
    sessionUserId: userId,
    handleHash: issued.handleHash,
    activationId: null,
    sessionActivatedAt: null,
  });
  return { ...issued, row };
}

export function authenticatedFixture(userId: string): Extract<AuthResult, { authenticated: true }> {
  const session: AuthenticatedSession = {
    status: 'AUTHENTICATED',
    userId,
    userAuthVersion: 4,
    checkedAt: new Date('2026-01-02T00:00:00.000Z'),
    validUntil: new Date('2026-02-01T00:00:00.000Z'),
    session: {
      kind: 'modern',
      handleHash: 'a'.repeat(64),
      legacyOrigin: false,
      issuedAt: new Date('2026-01-01T12:00:00.000Z'),
      expiresAt: new Date('2026-02-01T00:00:00.000Z'),
    },
  };
  return { authenticated: true, userId, session };
}

export const anonymousFixture = {
  authenticated: false,
  userId: null,
  error: 'No authentication cookie',
} as const;

/** Executes the real issuer against mocked transport, not a stubbed issuance decision. */
export function mockSessionTransaction(prisma: PrismaClient) {
  const authSession = {
    ...prisma.authSession,
    create: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const tx = Object.assign(prisma, { authSession });
  vi.mocked(prisma.$transaction).mockImplementation(async (work) => {
    if (typeof work !== 'function') throw new Error('Expected an interactive session transaction');
    return work(tx);
  });
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ now: new Date('2026-09-06T00:00:00Z') }]);
  return authSession;
}
