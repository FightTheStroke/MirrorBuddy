import { describe, it, expect, beforeEach } from 'vitest';
import { getUserIdFromCookie, isAuthenticated, setClientIdentity } from '../client-auth';

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
