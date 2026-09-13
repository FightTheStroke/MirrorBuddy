import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { prisma } from '@/lib/db';
import { validateAuth, AuthenticationError } from '@/lib/auth/server';
import { cookies } from 'next/headers';
import { assignBaseTierToNewUser } from '@/lib/tier/server';
import { calculateAndPublishAdminCounts } from '@/lib/helpers/publish-admin-counts';
import {
  anonymousFixture,
  authenticatedFixture,
  mockSessionTransaction,
} from '@/test/fixtures/session-compat';
import { expectNativeSessionCookie } from '@/test/fixtures/session-credentials';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma(), isDatabaseNotInitialized: vi.fn(() => false) };
});
vi.mock('@/lib/tier/server', () => ({ assignBaseTierToNewUser: vi.fn() }));
vi.mock('@/lib/auth/server', async (original) => ({
  ...(await original<typeof import('@/lib/auth/server')>()),
  validateAuth: vi.fn(),
}));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/helpers/publish-admin-counts', () => ({
  calculateAndPublishAdminCounts: vi.fn().mockResolvedValue(undefined),
}));

const setCookie = vi.fn();
const user = {
  id: 'user-123',
  authVersion: 4,
  disabled: false,
  profile: {},
  settings: {},
  progress: {},
};
const request = () => new NextRequest('http://localhost/api/user');
let sessionWrites: ReturnType<typeof mockSessionTransaction>;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('SESSION_SECRET', 'synthetic-user-fixture-secret-at-least-32-characters');
  sessionWrites = mockSessionTransaction(prisma);
  vi.mocked(validateAuth).mockResolvedValue(anonymousFixture);
  vi.mocked(cookies).mockResolvedValue({ set: setCookie } as never);
  vi.mocked(prisma.user.create).mockResolvedValue(user as never);
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
  vi.mocked(assignBaseTierToNewUser).mockResolvedValue(null);
  vi.mocked(calculateAndPublishAdminCounts).mockResolvedValue({ success: true, duration: 0 });
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/user', () => {
  it('never creates an anonymous account in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ guest: true });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
  it('returns authenticated production data', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.mocked(validateAuth).mockResolvedValue(authenticatedFixture(user.id));
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: user.id });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
  it('creates a dev guest and assigns Base tier after durable issuance', async () => {
    vi.mocked(assignBaseTierToNewUser).mockResolvedValue({ id: 'sub-base' } as never);
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: user.id });
    expect(prisma.user.create).toHaveBeenCalled();
    expect(assignBaseTierToNewUser).toHaveBeenCalledWith(user.id);
    const credential = expectNativeSessionCookie(
      setCookie.mock.calls.find(([name]) => name === 'mirrorbuddy-user-id')?.[1],
    );
    expect(sessionWrites.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: user.id,
        handleHash: credential.handleHash,
        authVersion: 4,
        legacyOrigin: false,
        issuedAt: new Date('2026-09-06T00:00:00Z'),
        expiresAt: new Date('2027-09-06T00:00:00Z'),
      }),
    });
    expect(setCookie).toHaveBeenCalledWith(
      'mirrorbuddy-user-id',
      expect.stringMatching(/^s2:/),
      expect.objectContaining({ httpOnly: true, maxAge: 31536000 }),
    );
  });
  it('does not create duplicate subscriptions for an existing user', async () => {
    vi.mocked(validateAuth).mockResolvedValue(authenticatedFixture(user.id));
    expect((await GET(request())).status).toBe(200);
    expect(assignBaseTierToNewUser).not.toHaveBeenCalled();
    expect(sessionWrites.create).not.toHaveBeenCalled();
  });
  it('preserves guest creation when Base tier is absent', async () => {
    expect((await GET(request())).status).toBe(200);
    expect(prisma.user.create).toHaveBeenCalled();
    expect(assignBaseTierToNewUser).toHaveBeenCalledWith(user.id);
  });
  it.each(['SESSION_REJECTED', 'SESSION_UNAVAILABLE', 'SESSION_NOT_ACTIVATED'] as const)(
    'never creates a replacement account for %s',
    async (code) => {
      vi.mocked(validateAuth).mockRejectedValue(new AuthenticationError(code));
      const response = await GET(request());
      expect(response.status).toBe(code === 'SESSION_REJECTED' ? 401 : 503);
      expect(await response.json()).toMatchObject({ code });
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(setCookie).not.toHaveBeenCalled();
    },
  );
  it('emits no cookies when the session insert fails', async () => {
    sessionWrites.create.mockRejectedValue(new Error('session insert failed'));
    expect((await GET(request())).status).toBe(500);
    expect(setCookie).not.toHaveBeenCalled();
  });
});
