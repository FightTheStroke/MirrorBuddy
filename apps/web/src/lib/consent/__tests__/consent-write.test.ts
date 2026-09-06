import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getUnifiedConsent,
  hasAnalyticsConsent,
  hasUnifiedConsent,
  initializeConsent,
  isConsentLoaded,
  retryConsentSync,
  saveAnalyticsConsent,
  saveTermsConsent,
  subscribeToAnalyticsConsent,
  syncUnifiedConsentToServer,
} from '../unified-consent-storage';
import { getConsentSyncSnapshot, resetConsentSnapshot } from '../consent-store';
import { AUTH_COOKIE_CLIENT, AUTH_COOKIE_NAME, clearCSRFToken, isAuthenticated } from '@/lib/auth';
import { setConsentTestAccount } from './consent-test-transport';

function respond(input: RequestInfo | URL, init?: RequestInit): Response {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url === '/api/session') return Response.json({ csrfToken: 'consent-test-token' });
  if (url === '/api/user/consent' && init?.method === 'POST') {
    if (typeof init.body !== 'string') throw new Error('Missing consent payload');
    const consent = JSON.parse(init.body);
    const persisted = isAuthenticated();
    return Response.json({
      success: true,
      consent,
      persisted,
      analyticsAllowed: persisted && consent.analytics === true,
    });
  }
  throw new Error(`Unexpected request: ${url}`);
}

describe('T6 honest consent writes', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetConsentSnapshot();
    clearCSRFToken();
    document.cookie = `${AUTH_COOKIE_CLIENT}=; path=/; max-age=0`;
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => respond(input, init));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetConsentSnapshot();
    clearCSRFToken();
  });

  it('does not enable an acceptance before exact acknowledgement, including after reload', async () => {
    setConsentTestAccount(true);
    const consent = saveAnalyticsConsent(true);
    expect(hasAnalyticsConsent()).toBe(false);
    expect(getConsentSyncSnapshot().pending).toContain('analytics');
    resetConsentSnapshot();
    expect(hasAnalyticsConsent()).toBe(false);
    await retryConsentSync('analytics');
    expect(hasAnalyticsConsent()).toBe(true);
    expect(getUnifiedConsent()?.cookies.acceptedAt).toBe(consent.cookies.acceptedAt);
    expect(getConsentSyncSnapshot().confirmations.analytics).toBe('persisted');
  });

  it('reuses csrfFetch and sends only the intended analytics decision', async () => {
    saveTermsConsent(true);
    setConsentTestAccount(true);
    const terms = getUnifiedConsent()?.tos;
    const consent = saveAnalyticsConsent(true);
    await syncUnifiedConsentToServer(consent);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/session',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(globalThis.fetch).not.toHaveBeenCalledWith('/api/tos', expect.anything());
    const call = vi.mocked(fetch).mock.calls.find(([url]) => url === '/api/user/consent');
    expect(new Headers(call?.[1]?.headers).get('X-CSRF-Token')).toBe('consent-test-token');
    expect(getUnifiedConsent()?.tos).toEqual(terms);
  });

  it.each([403, 500])(
    'keeps failed acceptance pending after HTTP %s and retries the same choice',
    async (status) => {
      setConsentTestAccount(true);
      vi.mocked(fetch).mockImplementation(async (input, init) =>
        input === '/api/user/consent'
          ? Response.json({ error: 'Save rejected' }, { status })
          : respond(input, init),
      );
      const consent = saveAnalyticsConsent(true);
      await expect(syncUnifiedConsentToServer(consent)).rejects.toMatchObject({
        code: 'http',
        status,
      });
      expect(hasAnalyticsConsent()).toBe(false);
      expect(getConsentSyncSnapshot()).toMatchObject({
        status: 'error',
        pending: ['analytics'],
        error: { code: 'http', retryable: true },
      });
      vi.mocked(fetch).mockImplementation(async (input, init) => respond(input, init));
      await retryConsentSync('analytics');
      expect(hasAnalyticsConsent()).toBe(true);
      expect(getUnifiedConsent()?.cookies.acceptedAt).toBe(consent.cookies.acceptedAt);
    },
  );

  it('exposes a retryable network failure without granting acceptance', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Network unavailable'));
    const consent = saveAnalyticsConsent(true);
    await expect(syncUnifiedConsentToServer(consent)).rejects.toMatchObject({ code: 'network' });
    expect(hasAnalyticsConsent()).toBe(false);
    expect(getConsentSyncSnapshot().error?.retryable).toBe(true);
  });

  it.each([
    { success: true },
    { success: false, consent: null, persisted: false },
    { success: true, consent: { analytics: true }, persisted: false },
  ])('rejects a success-shaped but invalid acknowledgement %j', async (body) => {
    vi.mocked(fetch).mockImplementation(async (input, init) =>
      input === '/api/user/consent' ? Response.json(body) : respond(input, init),
    );
    const consent = saveAnalyticsConsent(true);
    await expect(syncUnifiedConsentToServer(consent)).rejects.toMatchObject({
      code: 'invalid-response',
    });
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('rejects a valid-looking acknowledgement for a different decision', async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const response = respond(input, init);
      if (input !== '/api/user/consent') return response;
      const body = await response.json();
      return Response.json({ ...body, consent: { ...body.consent, analytics: false } });
    });
    await expect(syncUnifiedConsentToServer(saveAnalyticsConsent(true))).rejects.toMatchObject({
      code: 'invalid-response',
    });
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('notifies refusal synchronously before a failed network roundtrip', async () => {
    setConsentTestAccount(true);
    await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
    const listener = vi.fn();
    const unsubscribe = subscribeToAnalyticsConsent(listener);
    vi.mocked(fetch).mockRejectedValue(new TypeError('Network unavailable'));
    const refusal = saveAnalyticsConsent(false);
    expect(listener).toHaveBeenLastCalledWith(false);
    expect(hasAnalyticsConsent()).toBe(false);
    await expect(syncUnifiedConsentToServer(refusal)).rejects.toMatchObject({ code: 'network' });
    expect(hasAnalyticsConsent()).toBe(false);
    unsubscribe();
  });

  it('denies immediately and retains retry intent when storage rejects refusal', async () => {
    setConsentTestAccount(true);
    await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
    const listener = vi.fn();
    const unsubscribe = subscribeToAnalyticsConsent(listener);
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    expect(() => saveAnalyticsConsent(false)).toThrow();
    expect(hasAnalyticsConsent()).toBe(false);
    expect(listener).toHaveBeenLastCalledWith(false);
    expect(getConsentSyncSnapshot()).toMatchObject({ status: 'error', error: { code: 'storage' } });
    write.mockRestore();
    await retryConsentSync('analytics');
    expect(getUnifiedConsent()?.cookies.analytics).toBe(false);
    expect(hasAnalyticsConsent()).toBe(false);
    unsubscribe();
  });

  it('accepts guest terms locally without pretending protected account synchronization', async () => {
    const consent = saveTermsConsent(true);
    expect(hasUnifiedConsent()).toBe(true);
    await syncUnifiedConsentToServer(consent);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(getConsentSyncSnapshot().confirmations.terms).toBe('local');
  });

  it('finishes initialization for a signed-out visitor with no consent record', async () => {
    await expect(initializeConsent()).resolves.toBe(false);
    expect(isConsentLoaded()).toBe(true);
    expect(getConsentSyncSnapshot().ready).toBe(true);
    expect(getUnifiedConsent()).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
