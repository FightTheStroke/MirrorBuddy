import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearTermsConsent,
  clearUnifiedConsent,
  consentFromServer,
  getUnifiedConsent,
  hasAnalyticsConsent,
  hasUnifiedConsent,
  initializeConsent,
  retryConsentSync,
  saveAnalyticsConsent,
  saveTermsConsent,
  syncUnifiedConsentToServer,
} from '../unified-consent-storage';
import { getConsentSyncSnapshot, resetConsentSnapshot } from '../consent-store';
import { UNIFIED_CONSENT_KEY } from '../unified-consent';
import { installConsentTransportMock, setConsentTestAccount } from './consent-test-transport';

const date = '2026-09-01T00:00:00.000Z';
const cookies = {
  version: '1.0',
  acceptedAt: date,
  essential: true,
  analytics: true,
  marketing: false,
};
const serverTerms = { accepted: true, version: '1.0', acceptedAt: date };
const cookieEnvelope = { consent: cookies, analyticsAllowed: true };
const emptyEnvelope = { consent: null, analyticsAllowed: false };
function signIn() {
  setConsentTestAccount(true);
}

describe('T6 recovery boundaries', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetConsentSnapshot();
    setConsentTestAccount(false);
    installConsentTransportMock();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetConsentSnapshot();
    setConsentTestAccount(false);
  });

  it('retains an explicit terms decision through a failed read without changing analytics', async () => {
    await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
    const analytics = getUnifiedConsent()?.cookies;
    vi.mocked(fetch).mockClear();
    const read = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('Unavailable');
    });
    expect(() => saveTermsConsent(true)).toThrow();
    expect(hasUnifiedConsent()).toBe(false);
    read.mockRestore();
    await retryConsentSync('terms');
    expect(hasUnifiedConsent()).toBe(true);
    expect(getUnifiedConsent()?.cookies).toEqual(analytics);
    expect(hasAnalyticsConsent()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('retries a failed full wipe as a wipe, never as a legal decision', async () => {
    saveTermsConsent(true);
    await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
    const removeItem = localStorage.removeItem.bind(localStorage);
    const remove = vi.spyOn(localStorage, 'removeItem').mockImplementation((key) => {
      if (key === UNIFIED_CONSENT_KEY) throw new Error('Unavailable');
      removeItem(key);
    });
    expect(() => clearUnifiedConsent()).toThrow();
    expect(hasUnifiedConsent()).toBe(false);
    expect(hasAnalyticsConsent()).toBe(false);
    await expect(initializeConsent()).resolves.toBe(false);
    expect(hasAnalyticsConsent()).toBe(false);
    remove.mockRestore();
    vi.mocked(fetch).mockClear();
    await retryConsentSync();
    expect(getUnifiedConsent()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('retries a failed trial clear to unknown without POSTing a refusal or an acceptance', async () => {
    saveTermsConsent(true);
    await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
    const analytics = getUnifiedConsent()?.cookies;
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Unavailable');
    });
    expect(() => clearTermsConsent()).toThrow();
    expect(hasUnifiedConsent()).toBe(false);
    write.mockRestore();
    vi.mocked(fetch).mockClear();
    await retryConsentSync('terms');
    expect(getUnifiedConsent()?.tos.accepted).toBeNull();
    expect(getUnifiedConsent()?.cookies).toEqual(analytics);
    expect(hasAnalyticsConsent()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([null, 'analytics', ['unapproved']])(
    'does not manufacture retry intent from malformed pending %j',
    async (pending) => {
      localStorage.setItem(
        UNIFIED_CONSENT_KEY,
        JSON.stringify({
          version: '1.0',
          tos: { ...serverTerms, accepted: false },
          cookies: { ...cookies },
          pending,
        }),
      );
      expect(hasAnalyticsConsent()).toBe(false);
      expect(getUnifiedConsent()?.tos.accepted).toBe(false);
      expect(getUnifiedConsent()?.pending).toBeUndefined();
      await expect(retryConsentSync()).rejects.toMatchObject({ code: 'invalid-intent' });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('rebases a new choice after a failed read without discarding an unrelated explicit refusal', () => {
    localStorage.setItem(
      UNIFIED_CONSENT_KEY,
      JSON.stringify({
        version: '1.0',
        tos: { ...serverTerms, accepted: false },
        cookies,
      }),
    );
    const read = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('Unavailable');
    });
    expect(() => saveAnalyticsConsent(false)).toThrow();
    read.mockRestore();
    saveAnalyticsConsent(false);
    expect(getUnifiedConsent()?.tos.accepted).toBe(false);
    expect(getUnifiedConsent()?.cookies.analytics).toBe(false);
  });

  it('completes readiness after reloading a known no-record result', async () => {
    await initializeConsent();
    resetConsentSnapshot();
    await initializeConsent();
    expect(getConsentSyncSnapshot()).toMatchObject({ ready: true, status: 'idle' });
    expect(getUnifiedConsent()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('recovers initialization without repeating either legal decision', async () => {
    signIn();
    vi.mocked(fetch).mockRejectedValue(new TypeError('Offline'));
    await expect(initializeConsent()).rejects.toMatchObject({ code: 'network' });
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      expect(init?.method).toBe('GET');
      if (input === '/api/tos') return Response.json(serverTerms);
      if (input === '/api/user/consent') return Response.json(cookieEnvelope);
      throw new Error('Unexpected request');
    });
    await retryConsentSync();
    expect(getConsentSyncSnapshot()).toMatchObject({ ready: true, status: 'idle', error: null });
    expect(hasUnifiedConsent()).toBe(true);
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('does not reuse a guest no-record lookup after signing in', async () => {
    await initializeConsent();
    signIn();
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (input === '/api/tos') return Response.json(serverTerms);
      if (input === '/api/user/consent') return Response.json(cookieEnvelope);
      throw new Error('Unexpected request');
    });
    await expect(initializeConsent()).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('does not let initialization hide a newer optional write failure', async () => {
    signIn();
    let resolve: (response: Response) => void = () => {
      throw new Error('Not registered');
    };
    const termsResponse = new Promise<Response>((done) => {
      resolve = done;
    });
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (input === '/api/tos') return termsResponse;
      if (input === '/api/session') return Response.json({ csrfToken: 'test-token' });
      if (input === '/api/user/consent' && init?.method === 'GET')
        return Response.json(cookieEnvelope);
      return Response.json({ error: 'Unavailable' }, { status: 503 });
    });
    const loading = initializeConsent();
    await expect(syncUnifiedConsentToServer(saveAnalyticsConsent(false))).rejects.toMatchObject({
      status: 503,
    });
    resolve(Response.json(serverTerms));
    await loading;
    expect(getConsentSyncSnapshot()).toMatchObject({
      ready: true,
      status: 'error',
      error: { code: 'http', status: 503, scope: 'analytics' },
    });
    expect(hasUnifiedConsent()).toBe(true);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('does not revive cleared state or start another account request after an obsolete load', async () => {
    signIn();
    let resolve: (response: Response) => void = () => {
      throw new Error('Not registered');
    };
    const response = new Promise<Response>((done) => {
      resolve = done;
    });
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (input === '/api/tos') return response;
      return Response.json(cookieEnvelope);
    });
    const loading = initializeConsent().then(
      () => null,
      (error: unknown) => error,
    );
    clearUnifiedConsent();
    setConsentTestAccount(false);
    resolve(Response.json(serverTerms));
    await expect(loading).resolves.toMatchObject({ code: 'superseded' });
    expect(getUnifiedConsent()).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not interpret the terms API no-record response as an explicit refusal', () => {
    expect(consentFromServer({ accepted: false, version: '1.0' }, emptyEnvelope)).toBeNull();
    const explicit = saveTermsConsent(true);
    expect(consentFromServer({ accepted: false, version: '1.0' }, emptyEnvelope)?.tos).toEqual(
      explicit.tos,
    );
  });
});
