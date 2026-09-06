import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { onLCP, type LCPMetric } from 'web-vitals';
import { saveAnalyticsConsent } from '@/lib/consent/unified-consent-storage';
import {
  initWebVitalsWithConsent,
  setWebVitalsConsent,
} from '@/lib/analytics/web-vitals-collector';
import { useActivityTracker } from '../use-activity-tracker';
import { useSessionMetrics } from '@/hooks/useSessionMetrics';
import { trackWelcomeVisit } from '@/lib/funnel/client';
import { trackInviteFirstLogin, getEventBufferSize, forceFlushEvents } from '../invite-events';
import { trackSubscriptionEvent } from '@/lib/analytics/subscription-telemetry';
import { sendOptionalAnalytics } from '../optional-analytics-client';
import { clearCSRFToken } from '@/lib/auth';
import {
  prepareAnalyticsClient,
  grantAnalyticsClient,
  clearAnalyticsClient,
} from './client-analytics-fixtures';

const path = vi.hoisted(() => ({ value: '/it' }));
vi.mock('next/navigation', () => ({ usePathname: () => path.value }));
vi.mock('web-vitals', () => ({
  onLCP: vi.fn(),
  onCLS: vi.fn(),
  onINP: vi.fn(),
  onFCP: vi.fn(),
  onTTFB: vi.fn(),
}));
let fetchMock: ReturnType<typeof prepareAnalyticsClient>;
let stopVitals: (() => void) | undefined;
const metric: LCPMetric = {
  name: 'LCP',
  value: 200,
  rating: 'good',
  delta: 200,
  id: 'synthetic-metric',
  entries: [],
  navigationType: 'navigate',
};
beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = prepareAnalyticsClient();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  clearAnalyticsClient();
  cleanup();
  stopVitals?.();
  stopVitals = undefined;
  vi.unstubAllGlobals();
});

describe('reachable optional event sources', () => {
  it('profile permissions cannot authorize Web Vitals observers or transmission', () => {
    setWebVitalsConsent({ hasAnalyticsConsent: () => true });
    stopVitals = initWebVitalsWithConsent('eligible-user', {
      getState: () => ({ hasAnalyticsConsent: () => true, isLoaded: true }),
    });
    expect(onLCP).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('Web Vitals begins with canonical opt-in and ignores old callbacks after revoke/reaccept', async () => {
    stopVitals = initWebVitalsWithConsent('eligible-user');
    await grantAnalyticsClient();
    const oldCallback = vi.mocked(onLCP).mock.calls[0][0];
    oldCallback(metric);
    await vi.waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/metrics/web-vitals', expect.anything()),
    );
    const body = fetchMock.mock.calls.find(([url]) => url === '/api/metrics/web-vitals')?.[1]?.body;
    const payload: unknown = JSON.parse(String(body));
    expect(payload).toHaveProperty('metrics.0.name', 'LCP');
    expect(payload).not.toHaveProperty('metrics.0.userId');
    expect(String(body)).not.toContain('eligible-user');
    saveAnalyticsConsent(false);
    await grantAnalyticsClient();
    fetchMock.mockClear();
    oldCallback(metric);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.mocked(onLCP).mock.calls.at(-1)![0](metric);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
  it('activity uses only consent-scoped random UUIDs, not the client-auth cookie', async () => {
    const hook = renderHook(() => useActivityTracker());
    expect(fetchMock).not.toHaveBeenCalled();
    await act(grantAnalyticsClient);
    path.value = '/it/study';
    hook.rerender();
    await vi.waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/telemetry/activity', expect.anything()),
    );
    const body = JSON.parse(
      String(fetchMock.mock.calls.find(([url]) => url === '/api/telemetry/activity')![1]!.body),
    );
    expect(body.activityId).toMatch(/^[a-f0-9-]{36}$/);
    expect(JSON.stringify(body)).not.toContain('eligible-user');
    act(() => {
      saveAnalyticsConsent(false);
    });
    fetchMock.mockClear();
    path.value = '/it/quiz';
    hook.rerender();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('session counters and queued requests are removed immediately on refusal', async () => {
    const hook = renderHook(() => useSessionMetrics('euclide'));
    expect(hook.result.current.getSessionId()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    await act(grantAnalyticsClient);
    await vi.waitFor(() => expect(hook.result.current.getSessionId()).not.toBeNull());
    act(() => hook.result.current.recordTurn({ tokensIn: 1, tokensOut: 2, latencyMs: 10 }));
    expect(hook.result.current.getStats().turnCount).toBe(1);
    act(() => {
      saveAnalyticsConsent(false);
    });
    expect(hook.result.current.getStats().turnCount).toBe(0);
    expect(hook.result.current.getSessionId()).toBeNull();
    fetchMock.mockClear();
    act(() => hook.result.current.recordRefusal(true));
    hook.unmount();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('funnel, invite buffers and subscription logs require canonical consent', async () => {
    await trackWelcomeVisit();
    trackInviteFirstLogin('eligible-user', false);
    trackSubscriptionEvent({
      type: 'subscription.created',
      userId: 'eligible-user',
      tierId: 'base',
      previousTierId: null,
    });
    expect(getEventBufferSize()).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    await grantAnalyticsClient();
    trackInviteFirstLogin('eligible-user', false);
    expect(getEventBufferSize()).toBe(1);
    saveAnalyticsConsent(false);
    expect(getEventBufferSize()).toBe(0);
    await forceFlushEvents();
    expect(getEventBufferSize()).toBe(0);
  });
  it('aborts the signal while CSRF-token lookup is still pending', async () => {
    await grantAnalyticsClient();
    clearCSRFToken();
    let resolveToken: ((response: Response) => void) | undefined;
    fetchMock.mockImplementation((url, init) => {
      if (url === '/api/session')
        return new Promise((resolve) => {
          resolveToken = resolve;
        });
      if (init?.signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
      return Promise.resolve(Response.json({}));
    });
    const request = sendOptionalAnalytics('/api/telemetry/events', { events: [] });
    await vi.waitFor(() => expect(resolveToken).toBeDefined());
    saveAnalyticsConsent(false);
    resolveToken!(Response.json({ csrfToken: 'csrf' }));
    expect(await request).toBe(false);
    const sent = fetchMock.mock.calls.find(([url]) => url === '/api/telemetry/events');
    expect(sent?.[1]?.signal?.aborted).toBe(true);
  });
});
