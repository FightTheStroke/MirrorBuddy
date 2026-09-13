// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as voice } from '../voice-metrics/route';
import { GET as safety } from '../safety-events/route';
import { GET as a11y } from '../a11y-stats/route';
import { GET as external } from '../external-services/route';
import { EXTERNAL_SERVICE_QUOTAS } from '@/lib/metrics/external-service-metrics';

const db = vi.hoisted(() => ({
  sessionMetrics: { findMany: vi.fn() },
  safetyEvent: { findMany: vi.fn() },
  telemetryEvent: { findMany: vi.fn(), count: vi.fn() },
}));
vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@mirrorbuddy/db', () => ({ prisma: db }));
vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (..._middleware: unknown[]) =>
    (handler: (context: { req: NextRequest }) => Promise<Response>) =>
    (req: NextRequest) =>
      handler({ req }),
  withSentry: vi.fn(),
  withAdmin: vi.fn(),
  withAdminReadOnly: vi.fn(),
  withCSRF: vi.fn(),
}));

const now = new Date('2026-09-06T12:00:00Z');
const start = new Date('2026-08-30T12:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  db.sessionMetrics.findMany.mockResolvedValue([]);
  db.safetyEvent.findMany.mockResolvedValue([]);
  db.telemetryEvent.findMany.mockResolvedValue([]);
  db.telemetryEvent.count.mockResolvedValue(0);
});
afterEach(() => vi.useRealTimers());

describe('remaining actual analytics route truth semantics', () => {
  it('voice zero events are measured zero, while average duration has no denominator', async () => {
    const response = await voice(
      new NextRequest('http://localhost/api/dashboard/voice-metrics?days=7'),
    );
    const data = await response.json();
    expect(data.voice).toEqual({ totalSessions: 0, totalMinutes: 0, avgSessionMinutes: null });
    expect(data.metrics['voice.totalSessions']).toMatchObject({
      value: 0,
      status: 'measured',
      population: 'recordedTelemetry',
      coverage: null,
    });
    expect(data.metrics['voice.avgSessionMinutes']).toMatchObject({
      value: null,
      status: 'unavailable',
      unavailabilityReason: 'zeroDenominator',
      window: { start: start.toISOString(), end: now.toISOString() },
      computedAt: now.toISOString(),
    });
  });

  it('voice records retain measured duration and a bounded educational-session query', async () => {
    db.sessionMetrics.findMany.mockResolvedValue([
      { voiceMinutes: 2, createdAt: now, sessionId: 'recorded-voice' },
    ]);
    const data = await (
      await voice(new NextRequest('http://localhost/api/dashboard/voice-metrics'))
    ).json();
    expect(data.metrics['voice.avgSessionMinutes']).toMatchObject({
      value: 2,
      status: 'measured',
      unavailabilityReason: null,
      coverage: null,
    });
    expect(db.sessionMetrics.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdAt: { gte: start, lte: now }, isTestData: false, voiceMinutes: { gt: 0 } },
      }),
    );
  });

  it('safety uses the actual safety query helpers and the records population', async () => {
    db.safetyEvent.findMany.mockResolvedValue([
      {
        id: 'safety-record',
        type: 'input_blocked',
        severity: 'critical',
        timestamp: now,
        resolvedAt: null,
      },
    ]);
    const data = await (
      await safety(new NextRequest('http://localhost/api/dashboard/safety-events?days=7'))
    ).json();
    expect(data.summary).toEqual({ totalEvents: 1, unresolvedCount: 1, criticalCount: 1 });
    expect(data.metrics['summary.totalEvents']).toMatchObject({
      value: 1,
      source: 'SafetyEvent',
      population: 'records',
      status: 'measured',
      computedAt: now.toISOString(),
      window: { start: start.toISOString(), end: now.toISOString() },
    });
    expect(data.provenance.population).toBe('records');
    expect(db.safetyEvent.findMany).toHaveBeenCalledTimes(2);
  });

  it('a11y exposes provenance from actual recorded event aggregation with unknown coverage', async () => {
    db.telemetryEvent.findMany.mockResolvedValue([
      {
        action: 'profile_activated',
        label: 'dyslexia',
        sessionId: 'a11y-one',
        timestamp: now,
        metadata: null,
      },
      {
        action: 'setting_changed',
        label: 'fontSize',
        sessionId: 'a11y-one',
        timestamp: now,
        metadata: null,
      },
    ]);
    const data = await (
      await a11y(new NextRequest('http://localhost/api/dashboard/a11y-stats?days=7'))
    ).json();
    expect(data.summary).toEqual({ totalActivations: 1, uniqueSessions: 1, resetCount: 0 });
    expect(data.metrics['summary.totalActivations']).toMatchObject({
      value: 1,
      source: 'TelemetryEvent (accessibility, isTestData=false)',
      population: 'recordedTelemetry',
      coverage: null,
      computedAt: now.toISOString(),
      window: { start: data.period.startDate, end: now.toISOString() },
    });
    expect(data.metrics['byProfile.dyslexia'].value).toBe(1);
    expect(db.telemetryEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: 'accessibility', isTestData: false }),
      }),
    );
  });

  it('external-service usage is a quota-assumption estimate and retains raw quota configuration', async () => {
    db.telemetryEvent.findMany.mockResolvedValue([{ action: 'chat_completion', value: 1200 }]);
    const data = await (
      await external(new NextRequest('http://localhost/api/dashboard/external-services'))
    ).json();
    const chat = data.byService['Azure OpenAI'].find(
      (item: { metric: string }) => item.metric === 'Chat Tokens/min',
    );
    expect(chat.current).toBe(1200);
    expect(chat.limit).toBe(EXTERNAL_SERVICE_QUOTAS.AZURE_OPENAI.CHAT_TPM);
    expect(chat.truth).toMatchObject({
      value: 1,
      status: 'estimated',
      estimate: 'quotaAssumption',
      source: 'TelemetryEvent (external_api) / configured quota',
      population: 'recordedTelemetry',
      coverage: null,
      computedAt: now.toISOString(),
      window: { start: new Date(now.getTime() - 60_000).toISOString(), end: now.toISOString() },
    });
    expect(data.quotas.azureOpenAI.chatTpm).toBe(EXTERNAL_SERVICE_QUOTAS.AZURE_OPENAI.CHAT_TPM);
    expect(data.quotas.googleDrive.queriesPerMin).toBe(
      EXTERNAL_SERVICE_QUOTAS.GOOGLE_DRIVE.QUERIES_PER_MINUTE,
    );
    expect(data.quotas.braveSearch.monthlyQueries).toBe(
      EXTERNAL_SERVICE_QUOTAS.BRAVE_SEARCH.MONTHLY_QUERIES,
    );
  });
});
