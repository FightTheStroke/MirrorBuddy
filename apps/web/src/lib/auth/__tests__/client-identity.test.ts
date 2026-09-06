import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as auth from '../client-auth';

const csrfFetch = vi.hoisted(() => vi.fn());
vi.mock('../csrf-client', () => ({ csrfFetch }));

const account = {
  status: 'authenticated' as const,
  userId: 'real-user-not-session-handle',
  role: 'USER' as const,
  legacyOrigin: false,
  needsLegacyUpgrade: false,
};

describe('authoritative client identity', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    csrfFetch.mockReset();
    document.cookie = 'mirrorbuddy-user-id-client=; Max-Age=0; path=/';
  });

  it('does not authenticate a stale client hint', () => {
    auth.setClientIdentity({ status: 'anonymous' });
    document.cookie = 'mirrorbuddy-user-id-client=attacker';
    expect(auth.isAuthenticated()).toBe(false);
  });

  it.each(['', '%E0%A4%A', 'different-user'])('server identity overrides hint %s', (hint) => {
    document.cookie = `mirrorbuddy-user-id-client=${hint}`;
    auth.setClientIdentity(account);
    expect(auth.getUserIdFromCookie()).toBe(account.userId);
  });

  it.each([
    [401, 'SESSION_REJECTED'],
    [401, undefined],
    [503, 'SESSION_NOT_ACTIVATED'],
    [503, 'SESSION_UNAVAILABLE'],
  ])('does not turn %s / %s into a visitor', async (status, code) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code }), { status })),
    );
    const result = await auth.refreshClientIdentity();
    expect(result.status).toBe('unavailable');
    expect(() => auth.getUserIdFromCookie()).toThrow();
  });

  it('only AUTH_ABSENT confirms anonymous', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ code: 'AUTH_ABSENT' }), { status: 401 })),
    );
    expect(await auth.refreshClientIdentity()).toEqual({ status: 'anonymous' });
    expect(auth.getUserIdFromCookie()).toBeNull();
  });

  it('validates the projection rather than user or cookie fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ user: { id: 'session-handle' }, identity: account })),
        ),
    );
    await auth.refreshClientIdentity();
    expect(auth.getUserIdFromCookie()).toBe(account.userId);
  });

  it('rejects malformed success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ user: account }))),
    );
    expect((await auth.refreshClientIdentity()).status).toBe('unavailable');
  });

  it.each([null, undefined])(
    'missing bootstrap projection %s is unresolved, never anonymous',
    (projection) => {
      auth.setClientIdentity(projection);
      expect(auth.getClientIdentity().status).toBe('unavailable');
      expect(() => auth.getUserIdFromCookie()).toThrow();
    },
  );

  it('does not let an older refresh overwrite a later confirmed transition', async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise<Response>((done) => {
          resolve = done;
        }),
      ),
    );
    const pending = auth.refreshClientIdentity();
    auth.setClientIdentity({ status: 'anonymous' });
    resolve(new Response(JSON.stringify({ identity: account })));
    await pending;
    expect(auth.getClientIdentity()).toEqual({ status: 'anonymous' });
  });

  it('failed logout preserves identity and never attempts upgrade', async () => {
    auth.setClientIdentity({ ...account, legacyOrigin: true, needsLegacyUpgrade: true });
    csrfFetch.mockResolvedValue(new Response('{}', { status: 503 }));
    await expect(auth.logoutClient()).rejects.toThrow();
    expect(auth.getClientIdentity().status).toBe('authenticated');
    expect(csrfFetch).toHaveBeenCalledExactlyOnceWith('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ scope: 'current' }),
    });
  });

  it.each(['current', 'all'] as const)(
    'logout %s changes identity only after durable acknowledgement',
    async (scope) => {
      auth.setClientIdentity(account);
      csrfFetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));
      await auth.logoutClient(scope);
      expect(auth.getClientIdentity()).toEqual({ status: 'anonymous' });
      expect(csrfFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ scope }),
      });
    },
  );
});
