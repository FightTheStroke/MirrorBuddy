import { prisma } from '@/lib/db';
import type { BusinessKPIResponse } from './business-kpi-types';
import { metricTruth, snapshotContext } from './metric-truth';
import { readMetric } from './metric-truth-reader';

let cache: { data: BusinessKPIResponse; timestamp: number } | null = null;
const CACHE_TTL = 30_000;

export function clearCache(): void {
  cache = null;
}

export async function getBusinessKPIs(): Promise<BusinessKPIResponse> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) return cache.data;
  const computedAt = new Date().toISOString();
  const subscriptionContext = snapshotContext('UserSubscription + TierDefinition', computedAt);
  const [mrr, totalUsers, trialUsers, paidUsers, countries, maestri] = await Promise.all([
    readMetric(
      async () => {
        const subscriptions = await prisma.userSubscription.findMany({
          where: { status: 'ACTIVE', user: { isTestData: false } },
          include: { tier: { select: { monthlyPriceEur: true } } },
        });
        if (!subscriptions || subscriptions.some((sub) => sub.tier?.monthlyPriceEur == null))
          return null;
        return subscriptions.reduce((sum, sub) => sum + Number(sub.tier.monthlyPriceEur), 0);
      },
      { ...subscriptionContext, estimate: 'subscriptionPrice' },
    ),
    readMetric(
      () => prisma.user.count({ where: { isTestData: false } }),
      snapshotContext('User (isTestData=false)', computedAt),
    ),
    readMetric(
      () =>
        prisma.userSubscription.count({
          where: { status: 'TRIAL', user: { isTestData: false } },
        }),
      subscriptionContext,
    ),
    readMetric(
      () =>
        prisma.userSubscription.count({
          where: { status: 'ACTIVE', user: { isTestData: false } },
        }),
      subscriptionContext,
    ),
    readMetric(
      async () => {
        const settings = await prisma.settings.groupBy({
          by: ['language'],
          where: { user: { isTestData: false } },
          _count: true,
          orderBy: { _count: { language: 'desc' } },
          take: 10,
        });
        // Preserve the existing capability, but label language-based geography as a proxy.
        const languages: Record<string, { country: string; countryCode: string }> = {
          it: { country: 'Italy', countryCode: 'IT' },
          de: { country: 'Germany', countryCode: 'DE' },
          fr: { country: 'France', countryCode: 'FR' },
          es: { country: 'Spain', countryCode: 'ES' },
          en: { country: 'United Kingdom', countryCode: 'GB' },
        };
        return settings?.map((setting) => ({
          ...(languages[setting.language ?? ''] ?? { country: 'Unknown', countryCode: 'XX' }),
          users: setting._count,
          revenue: null,
        }));
      },
      { ...snapshotContext('Settings.language', computedAt), estimate: 'languageProxy' },
    ),
    readMetric(
      async () => {
        const sessions = await prisma.conversation.groupBy({
          by: ['maestroId'],
          where: { isTestData: false },
          _count: true,
          orderBy: { _count: { maestroId: 'desc' } },
          take: 10,
        });
        return sessions?.map((session) => ({
          name: session.maestroId,
          subject: 'Various',
          sessions: session._count,
          avgDuration: null,
        }));
      },
      snapshotContext('Conversation (retained records)', computedAt),
    ),
  ]);

  const unsupported = (source: string) =>
    metricTruth<number>(null, {
      ...snapshotContext(source, computedAt),
      reason: 'unsupportedCohort',
    });
  const arr = metricTruth(mrr.value === null ? null : mrr.value * 12, {
    ...subscriptionContext,
    estimate: 'annualized',
    reason: mrr.unavailabilityReason,
  });
  const metrics = {
    mrr,
    arr,
    totalUsers,
    trialUsers,
    paidUsers,
    activeUsers: unsupported('User.updatedAt (not activity)'),
    trialConversionRate: unsupported('UserSubscription (no conversion cohort)'),
    churnRate: unsupported('UserSubscription (no period-start cohort)'),
    growthRate: unsupported('UserSubscription (no historical revenue snapshot)'),
    totalRevenue: metricTruth<number>(null, {
      ...snapshotContext('Payment history', computedAt),
      reason: 'missingData',
    }),
    topCountries: countries,
    topMaestri: maestri,
  };
  const data: BusinessKPIResponse = {
    revenue: {
      mrr: mrr.value,
      arr: arr.value,
      growthRate: null,
      totalRevenue: null,
      currency: 'EUR',
      isEstimated: mrr.status === 'estimated',
    },
    users: {
      totalUsers: totalUsers.value,
      activeUsers: null,
      trialUsers: trialUsers.value,
      paidUsers: paidUsers.value,
      churnRate: null,
      trialConversionRate: null,
      isEstimated: false,
    },
    topCountries: countries.value ?? [],
    topMaestri: maestri.value ?? [],
    isEstimated: mrr.status === 'estimated' || countries.status === 'estimated',
    metrics,
  };
  cache = { data, timestamp: Date.now() };
  return data;
}
