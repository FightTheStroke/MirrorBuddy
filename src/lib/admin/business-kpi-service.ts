/**
 * Business KPI service - provides revenue, user, country, and maestro metrics
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type {
  BusinessKPIResponse,
  RevenueMetrics,
  UserMetrics,
  CountryMetric,
  MaestroMetric,
} from './business-kpi-types';

interface CachedKPIs {
  data: BusinessKPIResponse;
  timestamp: number;
}

let cache: CachedKPIs | null = null;
const CACHE_TTL = 30000;

/**
 * Clear cache (for testing)
 */
export function clearCache(): void {
  cache = null;
}

export async function getBusinessKPIs(): Promise<BusinessKPIResponse> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    logger.debug('Returning cached business KPIs');
    return cache.data;
  }

  try {
    const [revenue, users, countries, maestri] = await Promise.all([
      getRevenueMetrics(),
      getUserMetrics(),
      getTopCountries(),
      getTopMaestri(),
    ]);

    const isEstimated = revenue.isEstimated || users.isEstimated || countries.length === 0;

    const data: BusinessKPIResponse = {
      revenue,
      users,
      topCountries: countries,
      topMaestri: maestri,
      isEstimated,
    };

    cache = { data, timestamp: Date.now() };
    logger.info('Business KPIs computed successfully', { isEstimated });
    return data;
  } catch (error) {
    logger.error('Failed to compute business KPIs', undefined, error);
    return {
      revenue: {
        mrr: 0,
        arr: 0,
        growthRate: null,
        totalRevenue: null,
        currency: 'EUR',
        isEstimated: true,
      },
      users: {
        totalUsers: 0,
        activeUsers: 0,
        trialUsers: 0,
        paidUsers: 0,
        churnRate: null,
        trialConversionRate: 0,
        isEstimated: true,
      },
      topCountries: [],
      topMaestri: [],
      isEstimated: true,
    };
  }
}

async function getRevenueMetrics(): Promise<RevenueMetrics> {
  try {
    const subscriptions = await prisma.userSubscription.findMany({
      where: { status: 'ACTIVE' },
      include: { tier: { select: { monthlyPriceEur: true } } },
    });

    const mrr = subscriptions.reduce((sum, sub) => sum + Number(sub.tier?.monthlyPriceEur || 0), 0);
    const arr = mrr * 12;

    // Growth rate: compare current month active subs vs previous month
    const now = new Date();
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [currentMonthSubs, prevMonthSubs] = await Promise.all([
      prisma.userSubscription.count({
        where: { status: 'ACTIVE', startedAt: { lte: now } },
      }),
      prisma.userSubscription.count({
        where: {
          status: { in: ['ACTIVE', 'CANCELLED'] },
          startedAt: { lte: prevMonthEnd },
        },
      }),
    ]);

    const growthRate =
      prevMonthSubs > 0
        ? Math.round(((currentMonthSubs - prevMonthSubs) / prevMonthSubs) * 100 * 10) / 10
        : null;

    return {
      mrr,
      arr,
      growthRate,
      totalRevenue: null, // Requires Stripe integration for payment history
      currency: 'EUR',
      isEstimated: false,
    };
  } catch (error) {
    logger.warn('Failed to fetch revenue metrics', { error });
    return {
      mrr: 0,
      arr: 0,
      growthRate: null,
      totalRevenue: null,
      currency: 'EUR',
      isEstimated: true,
    };
  }
}

async function getUserMetrics(): Promise<UserMetrics> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, activeUsers, trialUsers, paidUsers, cancelledRecent] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { updatedAt: { gte: thirtyDaysAgo } },
      }),
      prisma.userSubscription.count({
        where: { status: 'TRIAL' },
      }),
      prisma.userSubscription.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.userSubscription.count({
        where: {
          status: 'CANCELLED',
          updatedAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    const trialConversionRate = trialUsers > 0 ? (paidUsers / trialUsers) * 100 : 0;

    // Churn rate: cancelled in 30 days / (active + cancelled at period start)
    const periodStartTotal = paidUsers + cancelledRecent;
    const churnRate =
      periodStartTotal > 0 ? Math.round((cancelledRecent / periodStartTotal) * 100 * 10) / 10 : 0;

    return {
      totalUsers,
      activeUsers,
      trialUsers,
      paidUsers,
      churnRate,
      trialConversionRate,
      isEstimated: false,
    };
  } catch (error) {
    logger.warn('Failed to fetch user metrics', { error });
    return {
      totalUsers: 0,
      activeUsers: 0,
      trialUsers: 0,
      paidUsers: 0,
      churnRate: null,
      trialConversionRate: 0,
      isEstimated: true,
    };
  }
}

async function getTopCountries(): Promise<CountryMetric[]> {
  try {
    const settings = await prisma.settings.groupBy({
      by: ['language'],
      _count: true,
      orderBy: { _count: { language: 'desc' } },
      take: 10,
    });

    const countryMap: Record<string, { country: string; countryCode: string }> = {
      it: { country: 'Italy', countryCode: 'IT' },
      de: { country: 'Germany', countryCode: 'DE' },
      fr: { country: 'France', countryCode: 'FR' },
      es: { country: 'Spain', countryCode: 'ES' },
      en: { country: 'United Kingdom', countryCode: 'GB' },
    };

    return settings.map((s) => {
      const info = countryMap[s.language || 'it'] || {
        country: 'Other',
        countryCode: 'XX',
      };
      return {
        country: info.country,
        countryCode: info.countryCode,
        users: s._count,
        revenue: null, // Requires Stripe integration for per-user revenue tracking
      };
    });
  } catch (error) {
    logger.warn('Failed to fetch country metrics', { error });
    return [];
  }
}

async function getTopMaestri(): Promise<MaestroMetric[]> {
  try {
    const sessions = await prisma.conversation.groupBy({
      by: ['maestroId'],
      _count: true,
      orderBy: { _count: { maestroId: 'desc' } },
      take: 10,
    });

    return sessions.map((s) => ({
      name: s.maestroId || 'Unknown',
      subject: 'Various',
      sessions: s._count,
      avgDuration: null, // Session duration not currently tracked
    }));
  } catch (error) {
    logger.warn('Failed to fetch maestri metrics', { error });
    return [];
  }
}
