import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  saveAnalyticsConsent,
  syncUnifiedConsentToServer,
  clearUnifiedConsent,
} from '@/lib/consent/unified-consent-storage';
import { useTelemetryStore } from '../telemetry-store';
import { initializeTelemetry } from '../telemetry-store/initialize';
import { clearCSRFToken } from '@/lib/auth';
import { setConsentTestAccount } from '@/lib/consent/__tests__/consent-test-transport';

const fetchMock = vi.fn<typeof fetch>();
const store = () => useTelemetryStore.getState();
async function optIn() {
  const consent = saveAnalyticsConsent(true);
  await syncUnifiedConsentToServer(consent);
  fetchMock.mockClear();
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  clearUnifiedConsent();
  setConsentTestAccount('eligible-user');
  clearCSRFToken();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset().mockImplementation(async (url, init) => {
    if (url === '/api/session') return new Response(JSON.stringify({ csrfToken: 'csrf' }));
    if (url === '/api/user/consent') {
      if (typeof init?.body !== 'string') throw new Error('Missing consent body');
      return Response.json({
        success: true,
        consent: JSON.parse(init.body),
        persisted: true,
        analyticsAllowed: true,
      });
    }
    return new Response(JSON.stringify({ stored: 1 }));
  });
  store().clearLocalData();
  store().updateConfig({ enabled: true, batchSize: 10 });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setConsentTestAccount(false);
});

describe('optional telemetry permission', () => {
  it('does not collect events, session timing or counters by default', () => {
    store().startSession();
    store().trackEvent('navigation', 'page_view');
    expect(store().eventQueue).toEqual([]);
    expect(store().sessionStartedAt).toBeNull();
    expect(store().localStats.todaySessions).toBe(0);
    expect(store().localStats.todayPageViews).toBe(0);
  });

  it('collects and sends for a confirmed eligible opt-in', async () => {
    await optIn();
    store().trackEvent('education', 'quiz_completed', 'math', 0);
    expect(store().eventQueue).toHaveLength(1);
    await store().flushEvents();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/telemetry/events',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(store().eventQueue).toEqual([]);
  });

  it('drops buffers immediately on refusal and never flushes them after reacceptance', async () => {
    await optIn();
    store().trackEvent('conversation', 'question_asked');
    saveAnalyticsConsent(false);
    expect(store().eventQueue).toEqual([]);
    await optIn();
    await store().flushEvents();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not restore an in-flight batch after refusal and later acceptance', async () => {
    await optIn();
    let rejectRequest: ((reason: Error) => void) | undefined;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject;
        }),
    );
    store().trackEvent('navigation', 'page_view');
    const sending = store().flushEvents();
    await vi.waitFor(() => expect(rejectRequest).toBeDefined());
    saveAnalyticsConsent(false);
    await optIn();
    rejectRequest!(new Error('offline'));
    await sending;
    expect(store().eventQueue).toEqual([]);
  });

  it('drops optional data while acceptance is pending or failed', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 503 }));
    const pending = saveAnalyticsConsent(true);
    store().trackEvent('navigation', 'page_view');
    expect(store().eventQueue).toEqual([]);
    await syncUnifiedConsentToServer(pending).catch(() => undefined);
    store().trackEvent('navigation', 'page_view');
    expect(store().eventQueue).toEqual([]);
  });

  it('does not collect when the server confirms choice but not age/guardian eligibility', async () => {
    fetchMock.mockImplementation(async (url, init) => {
      if (url === '/api/session') return Response.json({ csrfToken: 'csrf' });
      if (typeof init?.body !== 'string') throw new Error('Missing consent body');
      return Response.json({
        success: true,
        consent: JSON.parse(init.body),
        persisted: true,
        analyticsAllowed: false,
      });
    });
    await optIn();
    store().trackEvent('navigation', 'page_view');
    expect(store().eventQueue).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['', 'different-account'])(
    'does not reuse eligibility after the account changes to %s',
    async (account) => {
      await optIn();
      setConsentTestAccount(account || false);
      store().trackEvent('navigation', 'page_view');
      expect(store().eventQueue).toEqual([]);
    },
  );

  it('does not send a delayed flush or unload beacon after refusal', async () => {
    await optIn();
    vi.useFakeTimers();
    const beacon = vi.fn();
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beacon });
    const cleanup = initializeTelemetry();
    saveAnalyticsConsent(false);
    await vi.advanceTimersByTimeAsync(30_000);
    window.dispatchEvent(new Event('beforeunload'));
    cleanup();
    expect(beacon).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retains an eligible batch on a server error but drops a server refusal', async () => {
    await optIn();
    store().trackEvent('education', 'quiz_completed');
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'unavailable' }, { status: 500 }));
    await store().flushEvents();
    expect(store().eventQueue).toHaveLength(1);
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: 'Optional analytics not permitted' }, { status: 403 }),
    );
    await store().flushEvents();
    expect(store().eventQueue).toEqual([]);
  });

  it('cannot restore cached optional stats from a response arriving after revocation', async () => {
    await optIn();
    let resolveStats: ((response: Response) => void) | undefined;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStats = resolve;
        }),
    );
    const loading = store().fetchUsageStats();
    expect(resolveStats).toBeDefined();
    saveAnalyticsConsent(false);
    await optIn();
    resolveStats!(Response.json({ todaySessions: 5, lastUpdated: '2026-09-05T10:00:00Z' }));
    await loading;
    expect(store().usageStats).toBeNull();
  });
});
