import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { onLCP } from 'web-vitals';
import { sendOptionalAnalytics, getAnalyticsGeneration } from '../optional-analytics-client';
import { useTelemetryStore } from '../telemetry-store';
import { initializeTelemetry } from '../telemetry-store/initialize';
import { useSessionMetrics } from '@/hooks/useSessionMetrics';
import { initWebVitalsWithConsent } from '@/lib/analytics/web-vitals-collector';

const permission = vi.hoisted(() => ({
  listeners: new Set<(allowed: boolean) => void>(),
  requests: vi.fn(),
}));
// Fault-injection contract: notification is authoritative even before a getter catches up.
// Real canonical permission tests remain in telemetry-consent.test.ts.
vi.mock('@/lib/consent/unified-consent-storage', () => ({
  hasAnalyticsConsent: () => true,
  subscribeToAnalyticsConsent: (listener: (allowed: boolean) => void) => {
    permission.listeners.add(listener);
    return () => permission.listeners.delete(listener);
  },
}));
vi.mock('@/lib/auth', () => ({
  csrfFetch: (url: string, init?: RequestInit) => permission.requests(url, init),
}));
vi.mock('web-vitals', () => ({
  onLCP: vi.fn(),
  onCLS: vi.fn(),
  onINP: vi.fn(),
  onFCP: vi.fn(),
  onTTFB: vi.fn(),
}));
let stopVitals: (() => void) | undefined;
let stopTelemetry: (() => void) | undefined;
beforeEach(() => {
  vi.clearAllMocks();
  permission.requests.mockResolvedValue(Response.json({}));
  useTelemetryStore.getState().clearLocalData();
});
afterEach(() => {
  cleanup();
  stopVitals?.();
  stopVitals = undefined;
  stopTelemetry?.();
  stopTelemetry = undefined;
  vi.restoreAllMocks();
});
const notifyRefusal = () => permission.listeners.forEach((listener) => listener(false));

it('keeps one telemetry session across repeated true notifications and starts fresh after refusal', () => {
  stopTelemetry = initializeTelemetry();
  const firstSession = useTelemetryStore.getState().sessionId;
  expect(firstSession).not.toBeNull();
  permission.listeners.forEach((listener) => listener(true));
  permission.listeners.forEach((listener) => listener(true));
  expect(useTelemetryStore.getState().sessionId).toBe(firstSession);
  expect(
    useTelemetryStore.getState().eventQueue.filter((event) => event.action === 'session_started'),
  ).toHaveLength(1);
  notifyRefusal();
  expect(useTelemetryStore.getState().sessionStartedAt).toBeNull();
  permission.listeners.forEach((listener) => listener(true));
  expect(useTelemetryStore.getState().sessionId).not.toBe(firstSession);
  expect(
    useTelemetryStore.getState().eventQueue.filter((event) => event.action === 'session_started'),
  ).toHaveLength(1);
});

it('aborts pending requests and clears buffers on false even while the getter still says true', async () => {
  let finish: ((response: Response) => void) | undefined;
  permission.requests.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  useTelemetryStore.getState().trackEvent('navigation', 'page_view');
  const generation = getAnalyticsGeneration();
  const sending = sendOptionalAnalytics('/api/telemetry/events', { events: [] });
  const signal = permission.requests.mock.calls[0][1].signal;
  notifyRefusal();
  expect(signal.aborted).toBe(true);
  expect(getAnalyticsGeneration()).toBeGreaterThan(generation);
  expect(useTelemetryStore.getState().eventQueue).toEqual([]);
  finish!(Response.json({}));
  expect(await sending).toBe(false);
});

it('clears session metrics and does not register new Web Vitals observers on a false notification', async () => {
  const hook = renderHook(() => useSessionMetrics('euclide'));
  stopVitals = initWebVitalsWithConsent('eligible-user');
  await act(async () => {
    await Promise.resolve();
  });
  act(() => hook.result.current.recordTurn({ tokensIn: 1, tokensOut: 1, latencyMs: 1 }));
  expect(hook.result.current.getStats().turnCount).toBe(1);
  expect(onLCP).toHaveBeenCalledTimes(1);
  act(notifyRefusal);
  expect(hook.result.current.getSessionId()).toBeNull();
  expect(hook.result.current.getStats().turnCount).toBe(0);
  expect(onLCP).toHaveBeenCalledTimes(1);
});

it('aborts an already-started optional usage-stats GET on the same notification', async () => {
  let finish: ((response: Response) => void) | undefined;
  const get = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const loading = useTelemetryStore.getState().fetchUsageStats();
  const signal = get.mock.calls[0][1]?.signal;
  notifyRefusal();
  expect(signal?.aborted).toBe(true);
  finish!(Response.json({ lastUpdated: '2026-09-05T10:00:00Z' }));
  await loading;
  expect(useTelemetryStore.getState().usageStats).toBeNull();
});

it('keeps revocation active while an optional GET response body is still being decoded', async () => {
  let finish: ((stats: { lastUpdated: string }) => void) | undefined;
  const response = Response.json({});
  const decode = vi.spyOn(response, 'json').mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const get = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response);
  const loading = useTelemetryStore.getState().fetchUsageStats();
  await vi.waitFor(() => expect(decode).toHaveBeenCalledOnce());
  notifyRefusal();
  expect(get.mock.calls[0][1]?.signal?.aborted).toBe(true);
  finish!({ lastUpdated: '2026-09-05T10:00:00Z' });
  await loading;
  expect(useTelemetryStore.getState().usageStats).toBeNull();
});
