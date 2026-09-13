import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { IdentityProvider, useClientIdentity } from '../identity-provider';
import { getUserIdFromCookie, setClientIdentity } from '../client-auth';
import type { ClientIdentity } from '../identity-types';

const transport = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/csrf-client', () => ({ csrfFetch: transport }));
const account: ClientIdentity = {
  status: 'authenticated',
  userId: 'authoritative-account',
  role: 'ADMIN',
  legacyOrigin: false,
  needsLegacyUpgrade: false,
};
function Consumer() {
  const identity = useClientIdentity();
  return <output>{identity.status === 'authenticated' ? identity.userId : identity.status}</output>;
}
beforeEach(() => {
  vi.clearAllMocks();
  setClientIdentity({ status: 'pending' });
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('identity provider is independent of consent and hint storage', () => {
  it('seeds identity before any child requiring account ownership renders', () => {
    document.cookie = 'mirrorbuddy-user-id-client=%; path=/';
    function AccountBound() {
      return <span>{getUserIdFromCookie()}</span>;
    }
    render(
      <IdentityProvider initialIdentity={account}>
        <AccountBound />
      </IdentityProvider>,
    );
    expect(screen.getByText('authoritative-account')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });
  it('honors a new authoritative server projection after navigation', async () => {
    const view = render(
      <IdentityProvider initialIdentity={account}>
        <Consumer />
      </IdentityProvider>,
    );
    view.rerender(
      <IdentityProvider initialIdentity={{ status: 'anonymous' }}>
        <Consumer />
      </IdentityProvider>,
    );
    await waitFor(() => expect(screen.getByText('anonymous')).toBeInTheDocument());
  });
  it('refreshes through me on focus without ever upgrading a native session', async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ code: 'SESSION_REJECTED' }, { status: 401 }),
    );
    render(
      <IdentityProvider initialIdentity={account}>
        <Consumer />
      </IdentityProvider>,
    );
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(screen.getByText('unavailable')).toBeInTheDocument());
    expect(transport).not.toHaveBeenCalled();
  });
  it('attempts a raw legacy upgrade only once and refreshes its authoritative projection', async () => {
    transport.mockResolvedValue(Response.json({ success: true, upgraded: true }));
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({
        identity: { ...account, legacyOrigin: true, needsLegacyUpgrade: false },
      }),
    );
    render(
      <IdentityProvider
        initialIdentity={{ ...account, legacyOrigin: true, needsLegacyUpgrade: true }}
      >
        <Consumer />
      </IdentityProvider>,
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(transport).toHaveBeenCalledExactlyOnceWith('/api/auth/session/upgrade', {
      method: 'POST',
    });
  });
  it('discards account-bound memory through a reload on a confirmed cross-tab account change', async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ identity: { ...account, userId: 'next-account' } }),
    );
    render(
      <IdentityProvider initialIdentity={account}>
        <Consumer />
      </IdentityProvider>,
    );
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(window.location.reload).toHaveBeenCalledOnce());
  });
});
