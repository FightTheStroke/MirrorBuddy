/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ClientIdentity } from '@/lib/auth';
import { useMaestroConversation } from '../use-maestro-conversation';
import { useIdentityReset } from '../use-identity-reset';

const state = vi.hoisted(() => ({
  identity: { status: 'anonymous' } as ClientIdentity,
  csrfFetch: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  csrfFetch: state.csrfFetch,
  getClientIdentity: () => state.identity,
  whenIdentitySettled: async () => state.identity,
  isSameAccount: (a: ClientIdentity, b: ClientIdentity) =>
    a.status === 'authenticated'
      ? b.status === 'authenticated' && a.userId === b.userId
      : a.status === 'anonymous' && b.status === 'anonymous',
}));

vi.mock('@/lib/auth/identity-provider', () => ({ useClientIdentity: () => state.identity }));

const user = (userId: string): ClientIdentity => ({
  status: 'authenticated',
  userId,
  role: 'USER',
  legacyOrigin: false,
  needsLegacyUpgrade: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  state.identity = { status: 'anonymous' };
  state.csrfFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
});

describe('401 on conversation creation', () => {
  it('only a real visitor falls back to transient files', async () => {
    const { result } = renderHook(() => useMaestroConversation('manzoni'));
    await expect(result.current.ensureConversation()).resolves.toBeNull();
  });

  it('an authenticated user with an expired session gets an error, never guest mode', async () => {
    state.identity = user('u1');
    const { result } = renderHook(() => useMaestroConversation('manzoni'));
    await expect(result.current.ensureConversation()).rejects.toMatchObject({
      code: 'conversation_failed',
    });
  });
});

describe('useIdentityReset', () => {
  it('fires on account switch and sign-out, not on first settle or same account', () => {
    const onChange = vi.fn();
    state.identity = { status: 'pending' };
    const { rerender } = renderHook(() => useIdentityReset(onChange));
    state.identity = user('u1');
    rerender();
    state.identity = user('u1');
    rerender();
    expect(onChange).not.toHaveBeenCalled();
    state.identity = user('u2');
    act(() => rerender());
    expect(onChange).toHaveBeenCalledTimes(1);
    state.identity = { status: 'anonymous' };
    rerender();
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
