// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { mocks, routes, setCaller, usage } from './analytics-auth-fixtures';
import type { ExternalServicesData, SessionMetricsData } from '@/app/admin/analytics/types';
import { PRICING, THRESHOLDS } from '@/lib/metrics/cost-tracking-service';
import { EXTERNAL_SERVICE_QUOTAS } from '@/lib/metrics/external-service-metrics';
import { logger } from '@/lib/logger';
import { GET as getSessions } from '../session-metrics/route';
import { GET as getServices } from '../external-services/route';

describe.each(['ADMIN_READONLY', 'ADMIN'] as const)(
  'authorized %s payload compatibility',
  (role) => {
    it.each([undefined, 1, 7])(
      'preserves the session-metrics response for days=%s',
      async (days) => {
        setCaller(role);
        const query = days === undefined ? '' : `?days=${days}`;
        const response = await getSessions(
          new NextRequest(`http://localhost/api/dashboard/session-metrics${query}`),
        );
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (days ?? 7));
        const expected: SessionMetricsData = {
          period: { days: days ?? 7, startDate: startDate.toISOString() },
          summary: { totalSessions: 2, totalTurns: 10, avgTurnsPerSession: 5, avgLatencyMs: 126 },
          tokens: { totalIn: 100, totalOut: 50, total: 150 },
          cost: {
            totalEur: 0.13,
            avgPerSession: 0.063,
            p95PerSession: 0.075,
            voiceMinutes: 1.3,
            thresholds: {
              textWarn: THRESHOLDS.SESSION_TEXT_WARN,
              textLimit: THRESHOLDS.SESSION_TEXT_LIMIT,
              voiceWarn: THRESHOLDS.SESSION_VOICE_WARN,
              voiceLimit: THRESHOLDS.SESSION_VOICE_LIMIT,
            },
            pricing: {
              textPer1kTokens: PRICING.TEXT_PER_1K_TOKENS,
              voicePerMin: PRICING.VOICE_REALTIME_PER_MIN,
            },
          },
          safety: {
            totalRefusals: 4,
            correctRefusals: 3,
            refusalAccuracy: 75,
            jailbreakAttempts: 2,
            stuckLoops: 1,
            severityDistribution: { low: 1 },
          },
          outcomes: { completed: 2 },
          dailyBreakdown: { '2026-09-05': { sessions: 2, cost: 0.125, tokens: 150 } },
        };
        expect(response.status).toBe(200);
        const actual = await response.json();
        expect(actual).toMatchObject(expected);
        expect(actual.metrics['summary.totalSessions']).toMatchObject({
          value: 2,
          population: 'recordedTelemetry',
          coverage: null,
        });
        expect(mocks.aggregate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { createdAt: { gte: startDate, lte: new Date() }, isTestData: false },
          }),
        );
        expect(mocks.groupBy).toHaveBeenCalledTimes(3);
        for (const [args] of mocks.groupBy.mock.calls) {
          expect(args.where).toMatchObject({
            createdAt: { gte: startDate, lte: new Date() },
            isTestData: false,
          });
        }
        expect(mocks.costStats).toHaveBeenCalledWith(startDate, new Date(), true);
      },
    );

    it('preserves the external-services response consumed by admin analytics', async () => {
      setCaller(role);
      const response = await getServices(
        new NextRequest('http://localhost/api/dashboard/external-services'),
      );
      const quotas = EXTERNAL_SERVICE_QUOTAS;
      const expected: ExternalServicesData = {
        summary: {
          totalServices: 2,
          hasAlerts: true,
          criticalCount: 1,
          warningCount: 1,
          alertDetails: usage.map(({ service, metric, usagePercent, status }) => ({
            service,
            metric,
            usagePercent,
            status,
          })),
        },
        byService: {
          'Azure OpenAI': [
            {
              metric: 'Chat Tokens/min',
              current: 108000,
              limit: 120000,
              usagePercent: 90,
              status: 'warning',
              period: '1m',
            },
          ],
          'Brave Search': [
            {
              metric: 'Monthly Queries',
              current: 2100,
              limit: 2000,
              usagePercent: 105,
              status: 'exceeded',
              period: '1mo',
            },
          ],
        },
        quotas: {
          azureOpenAI: {
            chatTpm: quotas.AZURE_OPENAI.CHAT_TPM,
            chatRpm: quotas.AZURE_OPENAI.CHAT_RPM,
            embeddingTpm: quotas.AZURE_OPENAI.EMBEDDING_TPM,
            ttsRpm: quotas.AZURE_OPENAI.TTS_RPM,
            warnThreshold: quotas.AZURE_OPENAI.WARN_THRESHOLD,
          },
          googleDrive: {
            queriesPerMin: quotas.GOOGLE_DRIVE.QUERIES_PER_MINUTE,
            dailyQueries: quotas.GOOGLE_DRIVE.DAILY_QUERIES,
            warnThreshold: quotas.GOOGLE_DRIVE.WARN_THRESHOLD,
          },
          braveSearch: {
            monthlyQueries: quotas.BRAVE_SEARCH.MONTHLY_QUERIES,
            warnThreshold: quotas.BRAVE_SEARCH.WARN_THRESHOLD,
          },
        },
      };
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject(expected);
      // Sentry MIRRORBUDDY-3J (N+1): alerts used to re-run every usage query.
      expect(mocks.usage).toHaveBeenCalledOnce();
      expect(mocks.alerts).not.toHaveBeenCalled();
    });
  },
);

describe('external-services alerts', () => {
  it('lists only services that need attention, from the single usage read', async () => {
    setCaller('ADMIN');
    mocks.usage.mockResolvedValueOnce([
      ...usage,
      {
        service: 'Google Drive',
        metric: 'Queries/day',
        currentValue: 10,
        limit: 1000,
        usagePercent: 1,
        status: 'ok',
        period: '24h',
      },
    ]);

    const response = await getServices(
      new NextRequest('http://localhost/api/dashboard/external-services'),
    );
    const body = await response.json();

    expect(body.summary.totalServices).toBe(3);
    expect(body.summary.alertDetails.map((a: { service: string }) => a.service)).toEqual([
      'Azure OpenAI',
      'Brave Search',
    ]);
    expect(mocks.usage).toHaveBeenCalledOnce();
  });
});

describe('data failures remain failures rather than successful empty analytics', () => {
  const failures = [
    { route: routes[0], source: 'aggregate', read: mocks.aggregate },
    { route: routes[0], source: 'groupBy', read: mocks.groupBy },
    { route: routes[0], source: 'cost statistics', read: mocks.costStats },
    { route: routes[1], source: 'service usage', read: mocks.usage },
  ];
  it.each(failures)(
    'normalizes $source failure without exposing details',
    async ({ route, read }) => {
      setCaller('ADMIN');
      const error = new Error('private analytics storage details');
      read.mockRejectedValue(error);
      const log = vi.spyOn(logger, 'error');
      const response = await route.handlers.GET(new NextRequest(`http://localhost${route.path}`));
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Internal server error' });
      expect(log).toHaveBeenCalledWith(
        `API Error: GET ${route.path}`,
        expect.objectContaining({ path: route.path }),
        error,
      );
    },
  );
});
