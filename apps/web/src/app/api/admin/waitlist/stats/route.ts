/**
 * GET /api/admin/waitlist/stats
 *
 * Returns aggregated statistics for the waitlist:
 * - totalSignups: all non-test entries
 * - verifiedCount: entries with verifiedAt set
 * - unverifiedCount: entries without verifiedAt
 * - unsubscribedCount: entries with unsubscribedAt set
 * - marketingConsentCount: entries with marketingConsent = true
 * - promoRedeemedCount: entries with promoRedeemedAt set
 * - conversionRate: verifiedCount / totalSignups (0 if no signups)
 * - signupsLast7Days: signups in the last 7 days
 * - signupsLast30Days: signups in the last 30 days
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';

export const revalidate = 0;

export const GET = pipe(
  withSentry('/api/admin/waitlist/stats'),
  withCSRF,
  withAdmin,
)(async () => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const baseFilter = { isTestData: false };

  const [
    totalSignups,
    verifiedCount,
    unsubscribedCount,
    marketingConsentCount,
    promoRedeemedCount,
    signupsLast7Days,
    signupsLast30Days,
  ] = await Promise.all([
    prisma.waitlistEntry.count({ where: baseFilter }),

    prisma.waitlistEntry.count({
      where: { ...baseFilter, verifiedAt: { not: null } },
    }),

    prisma.waitlistEntry.count({
      where: { ...baseFilter, unsubscribedAt: { not: null } },
    }),

    prisma.waitlistEntry.count({
      where: { ...baseFilter, marketingConsent: true },
    }),

    prisma.waitlistEntry.count({
      where: { ...baseFilter, promoRedeemedAt: { not: null } },
    }),

    prisma.waitlistEntry.count({
      where: { ...baseFilter, createdAt: { gte: sevenDaysAgo } },
    }),

    prisma.waitlistEntry.count({
      where: { ...baseFilter, createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  const unverifiedCount = totalSignups - verifiedCount;
  const conversionRate = totalSignups > 0 ? verifiedCount / totalSignups : 0;

  return NextResponse.json({
    totalSignups,
    verifiedCount,
    unverifiedCount,
    unsubscribedCount,
    marketingConsentCount,
    promoRedeemedCount,
    conversionRate,
    signupsLast7Days,
    signupsLast30Days,
  });
});
