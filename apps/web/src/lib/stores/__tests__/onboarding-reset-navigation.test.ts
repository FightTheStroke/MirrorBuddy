import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOnboardingStore } from '../onboarding-store';
import { setClientIdentity, getClientIdentity, clearCSRFToken } from '@/lib/auth';
import { logoutCSRFToken } from '@/test/fixtures/logout-transport';

const transport = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.clearAllMocks();
  setClientIdentity({
    status: 'authenticated',
    userId: 'reset-account',
    role: 'USER',
    legacyOrigin: false,
    needsLegacyUpgrade: false,
  });
  useOnboardingStore.setState({ hasCompletedOnboarding: true, data: { name: 'Student' } });
  clearCSRFToken();
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>((input, init) => {
      if (input === '/api/session')
        return Promise.resolve(Response.json({ csrfToken: logoutCSRFToken }));
      return transport(input, init);
    }),
  );
  vi.stubGlobal('indexedDB', { deleteDatabase: vi.fn() });
});
afterEach(() => {
  clearCSRFToken();
  vi.mocked(window.location.assign).mockReset();
  vi.unstubAllGlobals();
});

describe('account reset document navigation', () => {
  it('discards document state only after successful deletion and identity clearing', async () => {
    transport.mockResolvedValue(Response.json({ success: true }));
    vi.mocked(window.location.assign).mockImplementation(() => {
      expect(getClientIdentity()).toEqual({ status: 'anonymous' });
      expect(useOnboardingStore.getState().data).toEqual({ name: '' });
    });
    await useOnboardingStore.getState().resetAllData();
    expect(window.location.assign).toHaveBeenCalledExactlyOnceWith(
      new URL('/welcome', window.location.origin).href,
    );
  });

  it.each([false, null])(
    'retains identity and document without acknowledgement: %s',
    async (success) => {
      transport.mockResolvedValue(Response.json({ success }));
      await expect(useOnboardingStore.getState().resetAllData()).rejects.toThrow(
        'Account reset acknowledgement missing',
      );
      expect(window.location.assign).not.toHaveBeenCalled();
      expect(getClientIdentity().status).toBe('authenticated');
    },
  );
});
