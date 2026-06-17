import { describe, it, expect, beforeEach, vi } from 'vitest';

const csrfFetchMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  csrfFetch: (...args: unknown[]) => csrfFetchMock(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

import { useParentalGateStore } from '../parental-gate-store';

function resetStore() {
  useParentalGateStore.setState({ isUnlocked: false, isPinSet: null, isLoading: false });
}

describe('useParentalGateStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  it('fetchStatus sets isPinSet=true on a 200 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ isSet: true }) });
    await useParentalGateStore.getState().fetchStatus();
    expect(useParentalGateStore.getState().isPinSet).toBe(true);
  });

  it('fetchStatus falls back to isPinSet=false for unauthenticated/trial users', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    await useParentalGateStore.getState().fetchStatus();
    expect(useParentalGateStore.getState().isPinSet).toBe(false);
  });

  it('verifyPin unlocks the gate when the PIN is valid', async () => {
    csrfFetchMock.mockResolvedValue({ ok: true, json: async () => ({ valid: true }) });
    const ok = await useParentalGateStore.getState().verifyPin('1234');
    expect(ok).toBe(true);
    expect(useParentalGateStore.getState().isUnlocked).toBe(true);
  });

  it('verifyPin does not unlock the gate when the PIN is invalid', async () => {
    csrfFetchMock.mockResolvedValue({ ok: true, json: async () => ({ valid: false }) });
    const ok = await useParentalGateStore.getState().verifyPin('0000');
    expect(ok).toBe(false);
    expect(useParentalGateStore.getState().isUnlocked).toBe(false);
  });

  it('setPin marks isPinSet on success', async () => {
    csrfFetchMock.mockResolvedValue({ ok: true, json: async () => ({ isSet: true }) });
    const ok = await useParentalGateStore.getState().setPin('1234');
    expect(ok).toBe(true);
    expect(useParentalGateStore.getState().isPinSet).toBe(true);
  });

  it('verifyPin returns false and clears loading on a network error', async () => {
    csrfFetchMock.mockRejectedValue(new Error('net'));
    const ok = await useParentalGateStore.getState().verifyPin('1234');
    expect(ok).toBe(false);
    expect(useParentalGateStore.getState().isLoading).toBe(false);
  });

  it('lock and unlock toggle the session state', () => {
    useParentalGateStore.getState().unlock();
    expect(useParentalGateStore.getState().isUnlocked).toBe(true);
    useParentalGateStore.getState().lock();
    expect(useParentalGateStore.getState().isUnlocked).toBe(false);
  });
});
