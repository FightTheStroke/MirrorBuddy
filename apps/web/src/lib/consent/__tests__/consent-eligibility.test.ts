import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setClientIdentity } from '@/lib/auth';
import {
  getUnifiedConsent,
  hasAnalyticsConsent,
  hasUnifiedConsent,
  initializeConsent,
  retryConsentSync,
  saveAnalyticsConsent,
  saveTermsConsent,
  subscribeToAnalyticsConsent,
  syncUnifiedConsentToServer,
} from '../unified-consent-storage';
import { getConsentSyncSnapshot, resetConsentSnapshot } from '../consent-store';
import { UNIFIED_CONSENT_KEY } from '../unified-consent';
import { installConsentTransportMock, setConsentTestAccount } from './consent-test-transport';

const account = '00000000-0000-4000-8000-000000000001';
const otherAccount = '00000000-0000-4000-8000-000000000002';
const date = '2026-09-01T00:00:00.000Z';
const cookies = {
  essential: true,
  analytics: true,
  marketing: false,
  version: '1.0',
  acceptedAt: date,
};
const terms = { accepted: true, version: '1.0', acceptedAt: date };
function signIn(userId = account) {
  setConsentTestAccount(userId);
}
function httpPermission(analyticsAllowed: boolean, persisted = true) {
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    if (input === '/api/session') return Response.json({ csrfToken: 'eligibility-test-token' });
    if (input === '/api/tos') return Response.json(terms);
    if (input === '/api/user/consent')
      return Response.json(
        init?.method === 'POST' && typeof init.body === 'string'
          ? { success: true, consent: JSON.parse(init.body), persisted, analyticsAllowed }
          : { consent: cookies, analyticsAllowed },
      );
    throw new Error('Unexpected request');
  });
}

describe('server-confirmed optional-processing eligibility', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setConsentTestAccount(false);
    installConsentTransportMock();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetConsentSnapshot();
    setConsentTestAccount(false);
  });

  it('guest receipt preserves study and choice but cannot permit collection', async () => {
    httpPermission(false, false);
    saveTermsConsent(true);
    await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
    expect(getUnifiedConsent()?.cookies.analytics).toBe(true);
    expect(getUnifiedConsent()?.pending).toBeUndefined();
    expect(hasAnalyticsConsent()).toBe(false);
    expect(hasUnifiedConsent()).toBe(true);
    expect(getConsentSyncSnapshot().confirmations.analytics).toBe('received');
  });

  it('confirmed account storage does not imply known age or guardian eligibility', async () => {
    signIn();
    httpPermission(false);
    await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
    expect(getUnifiedConsent()?.cookies.analytics).toBe(true);
    expect(hasAnalyticsConsent()).toBe(false);
    expect(getConsentSyncSnapshot().confirmations.analytics).toBe('persisted');
  });

  it('requires eligible account confirmation before collection, then denies on refusal', async () => {
    signIn();
    httpPermission(true);
    const listener = vi.fn();
    const unsubscribe = subscribeToAnalyticsConsent(listener);
    const acceptance = saveAnalyticsConsent(true);
    expect(hasAnalyticsConsent()).toBe(false);
    await syncUnifiedConsentToServer(acceptance);
    expect(hasAnalyticsConsent()).toBe(true);
    expect(listener).toHaveBeenLastCalledWith(true);
    saveAnalyticsConsent(false);
    expect(listener).toHaveBeenLastCalledWith(false);
    expect(hasAnalyticsConsent()).toBe(false);
    unsubscribe();
  });

  it('rejects a contradictory guest receipt claiming collection permission', async () => {
    httpPermission(true, false);
    await expect(syncUnifiedConsentToServer(saveAnalyticsConsent(true))).rejects.toMatchObject({
      code: 'invalid-response',
    });
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('does not restore optional permission from stored choice or a session-ready marker', async () => {
    signIn();
    httpPermission(true);
    localStorage.setItem(
      UNIFIED_CONSENT_KEY,
      JSON.stringify({ version: '1.0', tos: terms, cookies }),
    );
    expect(hasAnalyticsConsent()).toBe(false);
    await initializeConsent();
    expect(hasAnalyticsConsent()).toBe(true);
    resetConsentSnapshot();
    expect(hasAnalyticsConsent()).toBe(false);
    await initializeConsent();
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('invalidates permission and rejects a saved operation after account switch', async () => {
    signIn();
    httpPermission(true);
    await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
    const pending = saveAnalyticsConsent(true);
    signIn(otherAccount);
    await expect(syncUnifiedConsentToServer(pending)).rejects.toMatchObject({ code: 'superseded' });
    await expect(retryConsentSync('analytics')).rejects.toMatchObject({ code: 'superseded' });
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('does not grant from a response delivered after its authenticated context changed', async () => {
    signIn();
    let release: (response: Response) => void = () => {
      throw new Error('Not started');
    };
    let started: () => void = () => {
      throw new Error('Not registered');
    };
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    const response = new Promise<Response>((resolve) => {
      release = resolve;
    });
    let payload: unknown;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (input === '/api/session') return Response.json({ csrfToken: 'eligibility-test-token' });
      if (typeof init?.body !== 'string') throw new Error('Missing payload');
      payload = JSON.parse(init.body);
      started();
      return response;
    });
    const saving = syncUnifiedConsentToServer(saveAnalyticsConsent(true)).then(
      () => null,
      (error: unknown) => error,
    );
    await ready;
    signIn(otherAccount);
    release(
      Response.json({ success: true, consent: payload, persisted: true, analyticsAllowed: true }),
    );
    await expect(saving).resolves.toMatchObject({ code: 'superseded' });
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('notifies reset and cross-tab changes with a getter that remains fail-closed', async () => {
    signIn();
    httpPermission(true);
    await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
    const listener = vi.fn();
    const unsubscribe = subscribeToAnalyticsConsent(listener);
    window.dispatchEvent(new StorageEvent('storage', { key: UNIFIED_CONSENT_KEY }));
    expect(listener).toHaveBeenLastCalledWith(true);
    resetConsentSnapshot();
    expect(listener).toHaveBeenLastCalledWith(false);
    expect(hasAnalyticsConsent()).toBe(false);
    unsubscribe();
  });

  it('denies rather than throwing from the permission getter for unavailable auth context', async () => {
    signIn();
    httpPermission(true);
    await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
    setClientIdentity({ status: 'unavailable', reason: 'SESSION_UNAVAILABLE' });
    expect(hasAnalyticsConsent()).toBe(false);
    expect(getConsentSyncSnapshot().confirmations.analytics).toBe('persisted');
  });
});
