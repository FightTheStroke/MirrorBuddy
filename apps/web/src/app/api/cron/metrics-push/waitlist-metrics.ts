import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { CollectorContext } from './collector-utils';

const log = logger.child({ module: 'cron-metrics-push' });

export async function collectWaitlistMetrics({
  samples,
  instanceLabels,
  now,
}: CollectorContext): Promise<void> {
  const [total, verified, unsubscribed, promoRedeemed, converted] = await Promise.all([
    prisma.waitlistEntry.count({ where: { isTestData: false } }),
    prisma.waitlistEntry.count({ where: { isTestData: false, verifiedAt: { not: null } } }),
    prisma.waitlistEntry.count({ where: { isTestData: false, unsubscribedAt: { not: null } } }),
    prisma.waitlistEntry.count({ where: { isTestData: false, promoRedeemedAt: { not: null } } }),
    prisma.waitlistEntry.count({ where: { isTestData: false, convertedUserId: { not: null } } }),
  ]);
  if (![total, verified, unsubscribed, promoRedeemed, converted].every(Number.isFinite)) {
    throw new Error('Invalid waitlist counts');
  }
  samples.push(
    { name: 'waitlist_signups_total', labels: instanceLabels, value: total, timestamp: now },
    { name: 'waitlist_verified_total', labels: instanceLabels, value: verified, timestamp: now },
    {
      name: 'waitlist_unsubscribed_total',
      labels: instanceLabels,
      value: unsubscribed,
      timestamp: now,
    },
    {
      name: 'waitlist_promo_redeemed_total',
      labels: instanceLabels,
      value: promoRedeemed,
      timestamp: now,
    },
    {
      name: 'waitlist_conversion_rate',
      labels: instanceLabels,
      value: total > 0 ? converted / total : 0,
      timestamp: now,
    },
  );
  log.debug('Collected waitlist metrics', {
    total,
    verified,
    unsubscribed,
    promoRedeemed,
    converted,
  });
}
