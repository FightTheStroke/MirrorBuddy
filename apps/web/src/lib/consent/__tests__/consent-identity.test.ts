import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_COOKIE_CLIENT } from '@/lib/auth';
import { useTelemetryStore } from '@/lib/telemetry/telemetry-store';
import {
  getUnifiedConsent,
  hasAnalyticsConsent,
  initializeConsent,
  retryConsentSync,
  saveAnalyticsConsent,
  subscribeToAnalyticsConsent,
  syncUnifiedConsentToServer,
} from '../unified-consent-storage';
import { resetConsentSnapshot } from '../consent-store';
import { installConsentTransportMock, setConsentTestAccount } from './consent-test-transport';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setConsentTestAccount(true);
  installConsentTransportMock(true);
});
afterEach(() => {
  vi.restoreAllMocks();
  setConsentTestAccount();
  resetConsentSnapshot();
});

describe('consent auth identity generations', () => {
  it.each(['', 'different-account'])(
    'synchronously invalidates an observed identity change to %s and cannot revive by returning',
    async (next) => {
      await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
      const choice = getUnifiedConsent();
      const listener = vi.fn();
      const unsubscribe = subscribeToAnalyticsConsent(listener);
      document.cookie = `${AUTH_COOKIE_CLIENT}=${next}; path=/`;
      expect(hasAnalyticsConsent()).toBe(false);
      expect(listener).toHaveBeenLastCalledWith(false);
      setConsentTestAccount(true);
      expect(hasAnalyticsConsent()).toBe(false);
      expect(getUnifiedConsent()).toEqual(choice);
      unsubscribe();
    },
  );

  it('ignores an old acknowledgement even after returning to the same account', async () => {
    let release: (response: Response) => void = () => {
      throw new Error('Not registered');
    };
    let requested: () => void = () => {
      throw new Error('Not registered');
    };
    const ready = new Promise<void>((resolve) => {
      requested = resolve;
    });
    const response = new Promise<Response>((resolve) => {
      release = resolve;
    });
    let payload: unknown;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (input === '/api/session') return Response.json({ csrfToken: 'identity-test-token' });
      if (typeof init?.body !== 'string') throw new Error('Missing body');
      payload = JSON.parse(init.body);
      requested();
      return response;
    });
    const saving = syncUnifiedConsentToServer(saveAnalyticsConsent(true)).then(
      () => null,
      (error: unknown) => error,
    );
    await ready;
    setConsentTestAccount();
    expect(hasAnalyticsConsent()).toBe(false);
    setConsentTestAccount(true);
    release(
      Response.json({ success: true, consent: payload, persisted: true, analyticsAllowed: true }),
    );
    await expect(saving).resolves.toMatchObject({ code: 'superseded' });
    expect(hasAnalyticsConsent()).toBe(false);
    await expect(retryConsentSync('analytics')).rejects.toMatchObject({ code: 'superseded' });
  });

  it.each(['', '%'])(
    'requires fresh eligibility after returning from auth context %s',
    async (next) => {
      const consent = {
        version: '1.0',
        acceptedAt: '2026-09-01T00:00:00.000Z',
        essential: true,
        analytics: true,
        marketing: false,
      };
      vi.mocked(fetch).mockImplementation(async (input) =>
        input === '/api/tos'
          ? Response.json({ accepted: false, version: '1.0' })
          : Response.json({ consent, analyticsAllowed: true }),
      );
      await initializeConsent();
      expect(hasAnalyticsConsent()).toBe(true);
      document.cookie = `${AUTH_COOKIE_CLIENT}=${next}; path=/`;
      expect(hasAnalyticsConsent()).toBe(false);
      setConsentTestAccount(true);
      expect(hasAnalyticsConsent()).toBe(false);
      await initializeConsent();
      expect(fetch).toHaveBeenCalledTimes(4);
      expect(hasAnalyticsConsent()).toBe(true);
    },
  );

  it('synchronously aborts real T7 transport and drops its buffer on an observed account switch', async () => {
    await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
    const store = useTelemetryStore.getState;
    store().clearLocalData();
    store().updateConfig({ enabled: true, batchSize: 10 });
    store().trackEvent('navigation', 'page_view');
    let signal: AbortSignal | undefined;
    vi.mocked(fetch).mockImplementation(async (_input, init) => {
      if (!init?.signal) throw new Error('Missing abort signal');
      signal = init.signal;
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    });
    const sending = store().flushEvents();
    await vi.waitFor(() => expect(signal).toBeDefined());
    document.cookie = `${AUTH_COOKIE_CLIENT}=different-account; path=/`;
    expect(hasAnalyticsConsent()).toBe(false);
    expect(signal?.aborted).toBe(true);
    expect(store().eventQueue).toEqual([]);
    setConsentTestAccount(true);
    expect(hasAnalyticsConsent()).toBe(false);
    await sending;
    expect(store().eventQueue).toEqual([]);
  });
});
