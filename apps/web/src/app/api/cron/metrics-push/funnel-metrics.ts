import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { CollectorContext } from './collector-utils';

const log = logger.child({ module: 'cron-metrics-push' });

export async function collectFunnelMetrics({
  samples,
  instanceLabels,
  now,
}: CollectorContext): Promise<void> {
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const stageCounts = await prisma.funnelEvent.groupBy({
    by: ['stage'],
    where: { createdAt: { gte: thirtyDaysAgo }, isTestData: false },
    _count: { _all: true },
  });
  for (const stage of stageCounts) {
    samples.push({
      name: 'mirrorbuddy_funnel_stage_count',
      labels: { ...instanceLabels, stage: stage.stage },
      value: stage._count._all,
      timestamp: now,
    });
  }
  const stageOrder = [
    'VISITOR',
    'TRIAL_START',
    'TRIAL_ENGAGED',
    'LIMIT_HIT',
    'BETA_REQUEST',
    'APPROVED',
    'FIRST_LOGIN',
    'ACTIVE',
  ];
  const countMap = new Map(stageCounts.map((stage) => [stage.stage, stage._count._all]));
  for (let i = 1; i < stageOrder.length; i++) {
    const previous = countMap.get(stageOrder[i - 1]) ?? 0;
    const current = countMap.get(stageOrder[i]) ?? 0;
    samples.push({
      name: 'mirrorbuddy_funnel_conversion_rate',
      labels: {
        ...instanceLabels,
        from_stage: stageOrder[i - 1],
        to_stage: stageOrder[i],
      },
      value: previous > 0 ? current / previous : 0,
      timestamp: now,
    });
  }
  const visitorCount = countMap.get('VISITOR') ?? 0;
  const activeCount = countMap.get('ACTIVE') ?? 0;
  samples.push({
    name: 'mirrorbuddy_funnel_overall_conversion',
    labels: instanceLabels,
    value: visitorCount > 0 ? activeCount / visitorCount : 0,
    timestamp: now,
  });
  log.debug('Collected funnel metrics', { stages: stageCounts.length });
}
