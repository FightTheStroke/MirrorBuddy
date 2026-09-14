import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { _resetSecretCache, signCookieValue } from '../cookie-signing';
import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE, ADMIN_COOKIE_NAME } from '../cookie-constants';
import { legacySnapshot } from './session-lifecycle-fixtures';
import { nativeSessionFixture } from './session-compat-fixtures';
import {
  validateAuth,
  validateAdminAuth,
  validateAdminReadOnlyAuth,
  validateSessionOwnership,
  requireAuthenticatedUser,
} from '../session-auth';

const store = { get: vi.fn() };
function setNative(userId = 'user-123', changes: Record<string, unknown> = {}) {
  const fixture = nativeSessionFixture(userId);
  store.get.mockImplementation((name: string) =>
    name === AUTH_COOKIE_NAME ? { value: fixture.token } : undefined,
  );
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ ...fixture.row, ...changes }]);
  return fixture;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SESSION_SECRET', 'synthetic-session-auth-secret-at-least-32-characters');
  _resetSecretCache();
  vi.mocked(cookies).mockResolvedValue(store as never);
});
afterEach(() => {
  vi.unstubAllEnvs();
  _resetSecretCache();
});

describe('Session Auth', () => {
  it('returns anonymous only when both authentication cookies are absent', async () => {
    expect(await validateAuth()).toEqual({
      authenticated: false,
      userId: null,
      error: 'No authentication cookie',
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it.each(['plain-user-id', 'user-id.invalidsig', '', '.'.repeat(100)])(
    'rejects invalid presented credentials without anonymous fallback: %j',
    async (value) => {
      store.get.mockReturnValue({ value });
      await expect(validateAuth()).rejects.toMatchObject({
        statusCode: 401,
        code: 'SESSION_REJECTED',
      });
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    },
  );

  it('resolves a native handle to its real owner and returns the authorized reference', async () => {
    const fixture = setNative();
    const result = await validateAuth();
    expect(result).toMatchObject({
      authenticated: true,
      userId: 'user-123',
      session: {
        userId: 'user-123',
        userAuthVersion: 4,
        session: { kind: 'modern', handleHash: fixture.handleHash, legacyOrigin: false },
      },
    });
    expect(result.userId).not.toBe(fixture.token);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it.each(['production', 'development', 'test'] as const)(
    'never auto-creates a missing user or elevates an admin flag in %s',
    async (mode) => {
      vi.stubEnv('NODE_ENV', mode);
      vi.stubEnv('E2E_TEST_MODE', '1');
      const fixture = setNative('missing', {
        userId: null,
        userDisabled: null,
        userAuthVersion: null,
        userLegacyRevoked: null,
      });
      store.get.mockImplementation((name: string) => {
        if (name === AUTH_COOKIE_NAME) return { value: fixture.token };
        if (name === ADMIN_COOKIE_NAME) return { value: 'admin-session' };
        return undefined;
      });
      await expect(validateAuth()).rejects.toMatchObject({ code: 'SESSION_REJECTED' });
      expect(prisma.user.upsert).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    },
  );

  it('does not retry auto-creation after a database uniqueness failure', async () => {
    setNative();
    vi.mocked(prisma.$queryRaw).mockRejectedValue({ code: 'P2002' });
    await expect(validateAuth()).rejects.toMatchObject({
      statusCode: 503,
      code: 'SESSION_UNAVAILABLE',
    });
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  it.each([{ revokedAt: new Date() }, { userDisabled: true }, { sessionAuthVersion: 3 }])(
    'rejects invalid durable state: %j',
    async (state) => {
      setNative('user-123', state);
      await expect(validateAuth()).rejects.toMatchObject({ code: 'SESSION_REJECTED' });
    },
  );

  it('reports database unavailability rather than signing the user out', async () => {
    setNative();
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Database unavailable'));
    await expect(validateAuth()).rejects.toMatchObject({
      statusCode: 503,
      code: 'SESSION_UNAVAILABLE',
    });
  });

  it('supports a native session in the legacy cookie-name alias', async () => {
    const fixture = setNative();
    store.get.mockImplementation((name: string) =>
      name === LEGACY_AUTH_COOKIE ? { value: fixture.token } : undefined,
    );
    expect(await validateAuth()).toMatchObject({ authenticated: true, userId: 'user-123' });
  });

  it('deliberate legacy credential requires stored activation', async () => {
    store.get.mockReturnValue({ value: signCookieValue('session-owner').signed });
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      legacySnapshot({ activationId: null, sessionActivatedAt: null }),
    ]);
    await expect(validateAuth()).rejects.toMatchObject({
      statusCode: 503,
      code: 'SESSION_NOT_ACTIVATED',
    });
    vi.mocked(prisma.$queryRaw).mockResolvedValue([legacySnapshot()]);
    expect(await validateAuth()).toMatchObject({
      authenticated: true,
      userId: 'session-owner',
      session: { session: { kind: 'legacy' } },
    });
  });

  it('rejects a deliberate legacy SQL-injection-shaped ID before database access', async () => {
    const userId = "'; DROP TABLE users; --";
    store.get.mockReturnValue({ value: signCookieValue(userId).signed });
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      legacySnapshot({
        userId: null,
        userDisabled: null,
        userAuthVersion: null,
        userLegacyRevoked: null,
      }),
    ]);
    await expect(validateAuth()).rejects.toMatchObject({ code: 'SESSION_REJECTED' });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  describe('admin capabilities', () => {
    it('rejects anonymous admin access', async () => {
      expect(await validateAdminAuth()).toMatchObject({ authenticated: false, isAdmin: false });
    });
    it.each(['USER', 'ADMIN_READONLY', 'ADMIN'])('uses only the stored %s role', async (role) => {
      setNative();
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ role } as never);
      expect(await validateAdminAuth()).toMatchObject({
        authenticated: true,
        isAdmin: role === 'ADMIN',
      });
      expect(await validateAdminReadOnlyAuth()).toMatchObject({
        authenticated: true,
        canAccessAdminReadOnly: role !== 'USER',
      });
      expect(prisma.user.findUnique).toHaveBeenLastCalledWith({
        where: { id: 'user-123' },
        select: { role: true },
      });
    });
    it('does not hide an admin-role transport failure as an ordinary user', async () => {
      setNative();
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('DB error'));
      await expect(validateAdminAuth()).rejects.toMatchObject({
        statusCode: 503,
        code: 'SESSION_UNAVAILABLE',
      });
      await expect(validateAdminReadOnlyAuth()).rejects.toMatchObject({
        statusCode: 503,
        code: 'SESSION_UNAVAILABLE',
      });
    });
  });

  describe('conversation ownership', () => {
    it('allows voice sessions for an authenticated owner', async () => {
      expect(await validateSessionOwnership('voice-maestro-123', 'user-123')).toBe(true);
      expect(prisma.conversation.findFirst).not.toHaveBeenCalled();
    });
    it('queries conversation and owner together', async () => {
      vi.mocked(prisma.conversation.findFirst).mockResolvedValue({ id: 'session-123' } as never);
      expect(await validateSessionOwnership('session-123', 'user-123')).toBe(true);
      expect(prisma.conversation.findFirst).toHaveBeenCalledWith({
        where: { id: 'session-123', userId: 'user-123' },
        select: { id: true },
      });
    });
    it('rejects another owner', async () => {
      vi.mocked(prisma.conversation.findFirst).mockResolvedValue(null);
      expect(await validateSessionOwnership('session-123', 'wrong-user')).toBe(false);
    });
    it('propagates transport failure rather than asserting ownership absence', async () => {
      vi.mocked(prisma.conversation.findFirst).mockRejectedValue(new Error('DB error'));
      await expect(validateSessionOwnership('session-123', 'user-123')).rejects.toThrow();
    });
  });

  describe('required authentication', () => {
    it('returns the real user ID', async () => {
      setNative();
      expect(await requireAuthenticatedUser()).toEqual({ userId: 'user-123', errorResponse: null });
    });
    it('returns an explicit absent-auth 401', async () => {
      const result = await requireAuthenticatedUser();
      expect(result.userId).toBeNull();
      expect(result.errorResponse?.status).toBe(401);
      expect(await result.errorResponse?.json()).toMatchObject({ code: 'AUTH_ABSENT' });
    });
  });
});
