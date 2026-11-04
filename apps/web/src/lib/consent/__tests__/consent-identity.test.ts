import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setClientIdentity } from '@/lib/auth';
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
import { getConsentSyncSnapshot, resetConsentSnapshot } from '../consent-store';
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
  vi.useRealTimers();
});

describe('consent auth identity generations', () => {
  it.each([
    ['same-account', '/api/tos'],
    ['different-account', '/api/tos'],
    ['unavailable', '/api/tos'],
    ['same-account', '/api/user/consent'],
    ['different-account', '/api/user/consent'],
    ['unavailable', '/api/user/consent'],
  ] as const)(
    'waits for identity verification of %s during a successful %s read',
    async (next, refreshAt) => {
      vi.useFakeTimers();
      const requests: string[] = [];
      vi.mocked(fetch).mockImplementation(async (input) => {
        requests.push(String(input));
        if (input === refreshAt) setClientIdentity({ status: 'pending' });
        if (input === '/api/tos') {
          return Response.json({
            accepted: true,
            version: '1.0',
            acceptedAt: '2026-09-01T00:00:00.000Z',
          });
        }
        if (input === '/api/user/consent')
          return Response.json({ consent: null, analyticsAllowed: false });
        throw new Error('Unexpected consent request');
      });

      const loading = initializeConsent().then(
        (accepted) => accepted,
        (error: unknown) => error,
      );
      await vi.advanceTimersByTimeAsync(0);
      const waiting = getConsentSyncSnapshot();
      const requestedWhilePending = [...requests];
      if (next === 'unavailable')
        setClientIdentity({ status: 'unavailable', reason: 'SESSION_UNAVAILABLE' });
      else setConsentTestAccount(next === 'same-account' ? true : next);

      expect(waiting).toMatchObject({ ready: false, error: null });
      expect(requestedWhilePending).toEqual(
        refreshAt === '/api/tos' ? ['/api/tos'] : ['/api/tos', '/api/user/consent'],
      );
      if (next === 'same-account') {
        await expect(loading).resolves.toBe(true);
        expect(requests).toEqual(['/api/tos', '/api/user/consent']);
        expect(getConsentSyncSnapshot()).toMatchObject({ ready: true, error: null });
      } else {
        await expect(loading).resolves.toMatchObject({
          code: next === 'unavailable' ? 'identity' : 'superseded',
        });
        expect(requests).toEqual(requestedWhilePending);
        expect(getUnifiedConsent()).toBeNull();
      }
      expect(hasAnalyticsConsent()).toBe(false);
    },
  );

  it('does not start consent reads until an initial identity verification settles', async () => {
    vi.useFakeTimers();
    setClientIdentity({ status: 'pending' });
    vi.mocked(fetch).mockImplementation(async (input) =>
      input === '/api/tos'
        ? Response.json({ accepted: false, version: '1.0' })
        : Response.json({ consent: null, analyticsAllowed: false }),
    );
    const loading = initializeConsent().then(
      (accepted) => accepted,
      (error: unknown) => error,
    );
    await vi.advanceTimersByTimeAsync(0);
    const waiting = getConsentSyncSnapshot();
    expect(fetch).not.toHaveBeenCalled();
    setConsentTestAccount(true);

    expect(waiting).toMatchObject({ ready: false, error: null });
    await expect(loading).resolves.toBe(false);
    expect(getConsentSyncSnapshot()).toMatchObject({ ready: true, error: null });
  });

  it('still surfaces identity failure when verification does not settle within the timeout', async () => {
    vi.useFakeTimers();
    setClientIdentity({ status: 'pending' });
    const loading = initializeConsent().catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(5000);

    await expect(loading).resolves.toMatchObject({ code: 'identity' });
    expect(fetch).not.toHaveBeenCalled();
    expect(getConsentSyncSnapshot()).toMatchObject({
      ready: true,
      error: { code: 'identity', scope: 'initialization' },
    });
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it.each(['', 'different-account'])(
    'synchronously invalidates an observed identity change to %s and cannot revive by returning',
    async (next) => {
      await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
      const choice = getUnifiedConsent();
      const listener = vi.fn();
      const unsubscribe = subscribeToAnalyticsConsent(listener);
      setConsentTestAccount(next || false);
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
      if (next === '%') setClientIdentity({ status: 'unavailable', reason: 'SESSION_REJECTED' });
      else setConsentTestAccount(false);
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
    setConsentTestAccount('different-account');
    expect(hasAnalyticsConsent()).toBe(false);
    expect(signal?.aborted).toBe(true);
    expect(store().eventQueue).toEqual([]);
    setConsentTestAccount(true);
    expect(hasAnalyticsConsent()).toBe(false);
    await sending;
    expect(store().eventQueue).toEqual([]);
  });
});
