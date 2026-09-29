import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUserIdFromCookie,
  isAuthenticated,
  isSameAccount,
  setClientIdentity,
  whenIdentitySettled,
} from '../client-auth';

describe('client-auth compatibility helpers', () => {
  beforeEach(() => setClientIdentity({ status: 'anonymous' }));

  it.each(['', 'stale-user', '%E0%A4%A'])('ignores the non-authoritative hint %s', (hint) => {
    document.cookie = `mirrorbuddy-user-id-client=${hint}; path=/`;
    expect(getUserIdFromCookie()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  it('exposes only the server-confirmed account, not a handle or hint', () => {
    setClientIdentity({
      status: 'authenticated',
      userId: 'server-user',
      role: 'USER',
      legacyOrigin: false,
      needsLegacyUpgrade: false,
    });
    document.cookie = 'mirrorbuddy-user-id-client=session-handle; path=/';
    expect(getUserIdFromCookie()).toBe('server-user');
    expect(isAuthenticated()).toBe(true);
  });

  it.each(['pending', 'unavailable'] as const)('does not collapse %s into guest', (status) => {
    setClientIdentity(status === 'pending' ? { status } : { status, reason: 'SESSION_REJECTED' });
    expect(() => getUserIdFromCookie()).toThrow();
    expect(() => isAuthenticated()).toThrow();
  });
});

describe('identity settling helpers', () => {
  const student = (userId: string) =>
    ({
      status: 'authenticated',
      userId,
      role: 'USER',
      legacyOrigin: false,
      needsLegacyUpgrade: false,
    }) as const;

  it('treats a refreshed identity for the same account as the same account', () => {
    expect(isSameAccount(student('a'), student('a'))).toBe(true);
    expect(isSameAccount(student('a'), student('b'))).toBe(false);
    expect(isSameAccount({ status: 'anonymous' }, { status: 'anonymous' })).toBe(true);
    expect(isSameAccount(student('a'), { status: 'anonymous' })).toBe(false);
    expect(isSameAccount({ status: 'pending' }, { status: 'pending' })).toBe(false);
  });

  it('resolves immediately when identity is already settled', async () => {
    setClientIdentity(student('a'));
    await expect(whenIdentitySettled()).resolves.toEqual(student('a'));
  });

  it('waits for a pending identity to settle', async () => {
    setClientIdentity({ status: 'pending' });
    const settled = whenIdentitySettled();
    setClientIdentity(student('a'));
    await expect(settled).resolves.toEqual(student('a'));
  });

  it('gives up waiting after the timeout and returns the pending identity', async () => {
    setClientIdentity({ status: 'pending' });
    await expect(whenIdentitySettled(5)).resolves.toEqual({ status: 'pending' });
  });
});
