import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookie: vi.fn(),
  resolve: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: mocks.cookie }) }));
vi.mock('@/lib/auth/session-reader', () => ({ resolveSessionToken: mocks.resolve }));
vi.mock('@/lib/db', () => ({
  prisma: { user: { findUnique: mocks.findUnique, upsert: mocks.upsert } },
}));

import { validateAuth } from '../session-auth';
import { SessionReadError } from '../session-policy';
import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE } from '../cookie-constants';

describe('integrated authentication boundary', () => {
  beforeEach(() => vi.resetAllMocks());

  it('takes identity only from durable authorization, never from the handle', async () => {
    mocks.cookie.mockImplementation((name) =>
      name === AUTH_COOKIE_NAME ? { value: 'opaque-credential' } : undefined,
    );
    const resolution = {
      status: 'AUTHENTICATED',
      userId: 'actual-owner',
      userAuthVersion: 3,
      session: { kind: 'modern', handleHash: 'different-handle', legacyOrigin: false },
      checkedAt: new Date(),
      validUntil: new Date(),
    };
    mocks.resolve.mockResolvedValue(resolution);
    expect(await validateAuth()).toMatchObject({
      authenticated: true,
      userId: 'actual-owner',
      session: resolution,
    });
    expect(mocks.resolve).toHaveBeenCalledWith('opaque-credential');
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('permits anonymous selection only for a genuinely absent cookie', async () => {
    expect(await validateAuth()).toMatchObject({ authenticated: false, userId: null });
    expect(mocks.resolve).not.toHaveBeenCalled();
  });

  it.each(['SESSION_REVOKED', 'INVALID_TOKEN', 'USER_DISABLED'])(
    'surfaces %s instead of returning a guest-shaped result',
    async (reason) => {
      mocks.cookie.mockReturnValue({ value: 'credential' });
      mocks.resolve.mockResolvedValue({ status: 'DENIED', reason });
      await expect(validateAuth()).rejects.toMatchObject({ statusCode: 401 });
    },
  );

  it('keeps missing activation explicitly unavailable', async () => {
    mocks.cookie.mockReturnValue({ value: 'legacy' });
    mocks.resolve.mockResolvedValue({ status: 'NOT_ACTIVATED' });
    await expect(validateAuth()).rejects.toMatchObject({ statusCode: 503 });
  });

  it('surfaces database failure rather than anonymous authentication', async () => {
    mocks.cookie.mockReturnValue({ value: 'credential' });
    mocks.resolve.mockRejectedValue(new SessionReadError('DATABASE_FAILURE'));
    await expect(validateAuth()).rejects.toMatchObject({ statusCode: 503 });
  });

  it('supports the legacy cookie name without falling back from an invalid primary', async () => {
    mocks.cookie.mockImplementation((name) =>
      name === LEGACY_AUTH_COOKIE ? { value: 'old-cookie' } : undefined,
    );
    mocks.resolve.mockResolvedValue({ status: 'NOT_ACTIVATED' });
    await expect(validateAuth()).rejects.toMatchObject({ statusCode: 503 });
    expect(mocks.resolve).toHaveBeenCalledWith('old-cookie');
    mocks.cookie.mockReturnValue({ value: '' });
    mocks.resolve.mockResolvedValue({ status: 'DENIED', reason: 'INVALID_TOKEN' });
    await expect(validateAuth()).rejects.toMatchObject({ statusCode: 401 });
    expect(mocks.resolve).toHaveBeenLastCalledWith('');
  });
});
