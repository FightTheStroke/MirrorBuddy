import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getClientIdentity, setClientIdentity } from '../client-auth';
import {
  getUnifiedConsent,
  hasAnalyticsConsent,
  initializeConsent,
  retryConsentSync,
  saveAnalyticsConsent,
  syncUnifiedConsentToServer,
} from '@/lib/consent/unified-consent-storage';
import { resetConsentSnapshot } from '@/lib/consent/consent-store';
import {
  installConsentTransportMock,
  setConsentTestAccount,
} from '@/lib/consent/__tests__/consent-test-transport';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setConsentTestAccount(true);
  installConsentTransportMock(true);
});
afterEach(() => {
  vi.restoreAllMocks();
  resetConsentSnapshot();
});

describe('consent follows authoritative identity without losing intents', () => {
  it.each(['', '%', 'other-account'])(
    'hint %s does not change generation or allowed collection',
    async (hint) => {
      const intent = saveAnalyticsConsent(true);
      await syncUnifiedConsentToServer(intent);
      document.cookie = `mirrorbuddy-user-id-client=${hint}; path=/`;
      expect(hasAnalyticsConsent()).toBe(true);
      expect(getUnifiedConsent()?.cookies.analytics).toBe(true);
    },
  );

  it('unavailable identity stops delivery, preserves exact choice and retries on the same account', async () => {
    const account = getClientIdentity();
    const intent = saveAnalyticsConsent(false);
    const exact = getUnifiedConsent();
    setClientIdentity({ status: 'unavailable', reason: 'SESSION_UNAVAILABLE' });
    await expect(syncUnifiedConsentToServer(intent)).rejects.toMatchObject({ code: 'identity' });
    expect(fetch).not.toHaveBeenCalled();
    expect(getUnifiedConsent()).toEqual(exact);
    expect(hasAnalyticsConsent()).toBe(false);
    setClientIdentity(account);
    await retryConsentSync('analytics');
    expect(getUnifiedConsent()?.cookies).toEqual(exact?.cookies);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('not-activated identity cannot initialize as a guest', async () => {
    setClientIdentity({ status: 'unavailable', reason: 'SESSION_NOT_ACTIVATED' });
    await expect(initializeConsent()).rejects.toMatchObject({ code: 'identity' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('confirmed account changes still supersede an exact pending intent', async () => {
    const intent = saveAnalyticsConsent(true);
    setConsentTestAccount('other-account');
    await expect(syncUnifiedConsentToServer(intent)).rejects.toMatchObject({ code: 'superseded' });
    expect(fetch).not.toHaveBeenCalled();
    expect(getUnifiedConsent()?.pending).toContain('analytics');
  });
});
