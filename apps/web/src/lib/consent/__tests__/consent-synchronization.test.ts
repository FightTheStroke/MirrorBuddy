import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearUnifiedConsent,
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
import { getConsentSnapshot, getConsentSyncSnapshot, resetConsentSnapshot } from '../consent-store';
import { clearTrialConsent } from '../trial-consent';
import { AUTH_COOKIE_CLIENT } from '@/lib/auth';
import { installConsentTransportMock } from './consent-test-transport';

const account = '00000000-0000-4000-8000-000000000001';
const date = '2026-09-01T00:00:00.000Z';
function signIn() {
  document.cookie = `${AUTH_COOKIE_CLIENT}=${account}; path=/`;
}

describe('T6 synchronization races and readiness', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = `${AUTH_COOKIE_CLIENT}=; path=/; max-age=0`;
    installConsentTransportMock();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetConsentSnapshot();
    document.cookie = `${AUTH_COOKIE_CLIENT}=; path=/; max-age=0`;
  });

  it('confirms authenticated terms only from their versioned acknowledgement', async () => {
    signIn();
    const requests: string[] = [];
    vi.mocked(fetch).mockImplementation(async (input) => {
      requests.push(String(input));
      if (input === '/api/session') return Response.json({ csrfToken: 'test-token' });
      if (input === '/api/tos')
        return Response.json({ success: true, version: '1.0', acceptedAt: date });
      throw new Error('Unexpected endpoint');
    });
    saveAnalyticsConsent(true);
    const analytics = getUnifiedConsent()?.cookies;
    const terms = saveTermsConsent(true);
    expect(hasUnifiedConsent()).toBe(false);
    await syncUnifiedConsentToServer(terms);
    expect(hasUnifiedConsent()).toBe(true);
    expect(getUnifiedConsent()?.tos.acceptedAt).toBe(date);
    expect(getUnifiedConsent()?.cookies).toEqual(analytics);
    expect(hasAnalyticsConsent()).toBe(false);
    expect(requests).toEqual(['/api/session', '/api/tos']);
  });

  it('rejects guest-only acknowledgement when an account save was requested', async () => {
    signIn();
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (input === '/api/session') return Response.json({ csrfToken: 'test-token' });
      if (typeof init?.body !== 'string') throw new Error('Missing request body');
      return Response.json({
        success: true,
        consent: JSON.parse(init.body),
        persisted: false,
        analyticsAllowed: false,
      });
    });
    await expect(syncUnifiedConsentToServer(saveAnalyticsConsent(true))).rejects.toMatchObject({
      code: 'invalid-response',
    });
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('finishes authenticated initialization with no prior decisions and does not refetch', async () => {
    signIn();
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (input === '/api/tos') return Response.json({ accepted: false, version: '1.0' });
      if (input === '/api/user/consent')
        return Response.json({ consent: null, analyticsAllowed: false });
      throw new Error('Unexpected endpoint');
    });
    await expect(initializeConsent()).resolves.toBe(false);
    expect(isConsentLoaded()).toBe(true);
    expect(getConsentSyncSnapshot()).toMatchObject({ ready: true, status: 'idle' });
    await initializeConsent();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('surfaces initialization failure without rendering stale mandatory acceptance as ready', async () => {
    saveTermsConsent(true);
    signIn();
    vi.mocked(fetch).mockRejectedValue(new TypeError('Offline'));
    await expect(initializeConsent()).rejects.toMatchObject({ code: 'network' });
    expect(getConsentSyncSnapshot()).toMatchObject({ ready: true, status: 'error' });
    expect(getConsentSnapshot()).toBe(false);
    await waitForInitializationFailure();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('keeps valid terms when storage fails during an optional refusal', async () => {
    saveTermsConsent(true);
    await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Unavailable');
    });
    expect(() => saveAnalyticsConsent(false)).toThrow();
    expect(hasAnalyticsConsent()).toBe(false);
    expect(hasUnifiedConsent()).toBe(true);
  });

  it('does not enable optional collection if persisting the successful acknowledgement fails', async () => {
    const choice = saveAnalyticsConsent(true);
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Unavailable');
    });
    await expect(syncUnifiedConsentToServer(choice)).rejects.toMatchObject({ code: 'storage' });
    expect(hasAnalyticsConsent()).toBe(false);
    expect(getUnifiedConsent()?.pending).toContain('analytics');
  });

  it('cannot revive acceptance from a late acknowledgement after a newer refusal', async () => {
    let release: (response: Response) => void = () => {
      throw new Error('Not started');
    };
    let started: () => void = () => {
      throw new Error('Not registered');
    };
    const startedPromise = new Promise<void>((resolve) => {
      started = resolve;
    });
    const pendingResponse = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const sent: boolean[] = [];
    let initialBody: unknown;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (input === '/api/session') return Response.json({ csrfToken: 'test-token' });
      if (input !== '/api/user/consent' || typeof init?.body !== 'string')
        throw new Error('Unexpected request');
      const body = JSON.parse(init.body);
      sent.push(body.analytics);
      if (body.analytics) {
        initialBody = body;
        started();
        return pendingResponse;
      }
      return Response.json({
        success: true,
        consent: body,
        persisted: false,
        analyticsAllowed: false,
      });
    });
    const listener = vi.fn();
    const unsubscribe = subscribeToAnalyticsConsent(listener);
    const acceptance = syncUnifiedConsentToServer(saveAnalyticsConsent(true)).then(
      () => null,
      (error: unknown) => error,
    );
    await startedPromise;
    const refusal = syncUnifiedConsentToServer(saveAnalyticsConsent(false));
    expect(hasAnalyticsConsent()).toBe(false);
    release(
      Response.json({
        success: true,
        consent: initialBody,
        persisted: false,
        analyticsAllowed: false,
      }),
    );
    await expect(acceptance).resolves.toMatchObject({ code: 'superseded' });
    await refusal;
    expect(sent).toEqual([true, false]);
    expect(listener).not.toHaveBeenCalledWith(true);
    expect(getUnifiedConsent()?.cookies.analytics).toBe(false);
    unsubscribe();
  });

  it('clearTrialConsent clears state without manufacturing an explicit terms refusal', () => {
    clearTrialConsent();
    expect(getUnifiedConsent()).toBeNull();
    saveTermsConsent(true);
    clearTrialConsent();
    expect(getUnifiedConsent()?.tos.accepted).toBeNull();
    expect(hasUnifiedConsent()).toBe(false);
  });

  it('full clear cancels stored retry intent and immediately notifies optional denial', async () => {
    await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
    const listener = vi.fn();
    const unsubscribe = subscribeToAnalyticsConsent(listener);
    clearUnifiedConsent();
    expect(listener).toHaveBeenLastCalledWith(false);
    expect(getUnifiedConsent()).toBeNull();
    await expect(retryConsentSync()).rejects.toMatchObject({ code: 'invalid-intent' });
    unsubscribe();
  });
});

async function waitForInitializationFailure() {
  await vi.waitFor(() => expect(getConsentSyncSnapshot().status).toBe('error'));
}
