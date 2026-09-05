import { afterEach, beforeEach, vi } from 'vitest';
import type { User } from '@prisma/client';

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  findUser: vi.fn(),
  upsertUser: vi.fn(),
  aggregate: vi.fn(),
  groupBy: vi.fn(),
  costStats: vi.fn(),
  usage: vi.fn(),
  alerts: vi.fn(),
}));

export { mocks };

vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mocks.findUser, upsert: mocks.upsertUser },
    sessionMetrics: { aggregate: mocks.aggregate, groupBy: mocks.groupBy },
  },
}));
vi.mock('@/lib/metrics/cost-tracking-service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/metrics/cost-tracking-service')>()),
  getCostStats: mocks.costStats,
}));
vi.mock('@/lib/metrics/external-service-metrics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/metrics/external-service-metrics')>()),
  getAllExternalServiceUsage: mocks.usage,
  getServiceAlerts: mocks.alerts,
}));
vi.mock('@/lib/observability/sentry-tier-context', () => ({
  setSentryTierContext: vi.fn().mockResolvedValue(undefined),
}));

import { AUTH_COOKIE_NAME, signCookieValue } from '@/lib/auth/server';
import type { ExternalServiceUsage } from '@/lib/metrics/external-service-metrics';
import * as sessionMetrics from '../session-metrics/route';
import * as externalServices from '../external-services/route';

export const routes = [
  { path: '/api/dashboard/session-metrics', handlers: sessionMetrics },
  { path: '/api/dashboard/external-services', handlers: externalServices },
];
export const dataReads = [
  mocks.aggregate,
  mocks.groupBy,
  mocks.costStats,
  mocks.usage,
  mocks.alerts,
];
export type Caller = User['role'] | null;

export function setCookie(value?: string): void {
  mocks.cookies.mockResolvedValue({
    get: (name: string) => (name === AUTH_COOKIE_NAME && value ? { name, value } : undefined),
  });
}

export function setCaller(role: Caller): void {
  setCookie(role ? signCookieValue('analytics-operator').signed : undefined);
  mocks.findUser.mockResolvedValue(role ? { id: 'analytics-operator', role } : null);
}

export const usage: ExternalServiceUsage[] = [
  {
    service: 'Azure OpenAI',
    metric: 'Chat Tokens/min',
    currentValue: 108000,
    limit: 120000,
    usagePercent: 90,
    status: 'warning',
    period: '1m',
  },
  {
    service: 'Brave Search',
    metric: 'Monthly Queries',
    currentValue: 2100,
    limit: 2000,
    usagePercent: 105,
    status: 'exceeded',
    period: '1mo',
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('SESSION_SECRET', 'synthetic-w3-t3-analytics-test-secret-at-least-32-characters');
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-05T12:00:00.000Z'));
  setCaller(null);
  mocks.aggregate.mockResolvedValue({
    _count: 2,
    _sum: {
      turnCount: 10,
      tokensIn: 100,
      tokensOut: 50,
      voiceMinutes: 1.25,
      costEur: 0.125,
      refusalCount: 4,
      refusalCorrect: 3,
      stuckLoopCount: 1,
      jailbreakAttempts: 2,
    },
    _avg: { avgTurnLatencyMs: 125.5, costEur: 0.0625, turnCount: 5 },
  });
  mocks.groupBy.mockImplementation(async ({ by }: { by: string[] }) => {
    if (by[0] === 'outcome') return [{ outcome: 'completed', _count: 2 }];
    if (by[0] === 'incidentSeverity') return [{ incidentSeverity: 'low', _count: 1 }];
    if (by[0] === 'createdAt') {
      return [
        {
          createdAt: new Date('2026-09-05T10:00:00.000Z'),
          _count: 1,
          _sum: { costEur: 0.075, tokensIn: 60, tokensOut: 30 },
        },
        {
          createdAt: new Date('2026-09-05T11:00:00.000Z'),
          _count: 1,
          _sum: { costEur: 0.05, tokensIn: 40, tokensOut: 20 },
        },
      ];
    }
    throw new Error(`Unexpected analytics grouping: ${by.join(',')}`);
  });
  mocks.costStats.mockResolvedValue({ p95Cost: 0.075 });
  mocks.usage.mockResolvedValue(usage);
  mocks.alerts.mockResolvedValue(usage);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
