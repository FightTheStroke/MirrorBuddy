import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';

export const revalidate = 0;

type BucketConfig = {
  bucketLabel: string;
};

type ABExperimentRecord = {
  id: string;
  name: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  bucketConfigs: BucketConfig[];
};

type BucketCount = {
  abExperimentId: string | null;
  abBucketLabel: string | null;
  _count: { _all: number };
};

type ConversationIdRow = { id: string; userId: string };

type SessionMetricsAggregate = {
  _avg: {
    turnCount: number | null;
    avgTurnLatencyMs: number | null;
    stuckLoopCount: number | null;
    refusalCount: number | null;
  };
};

type SessionOutcomeGroup = {
  outcome: string | null;
  _count: { _all: number };
};

const toMetric = (value: number | null): number => value ?? 0;
const roundOne = (value: number): number => Math.round(value * 10) / 10;

export const GET = pipe(
  withSentry('/api/admin/research/ab-results'),
  withAdminReadOnly,
)(async () => {
  const model = (
    prisma as unknown as { aBExperiment?: { findMany: (args: unknown) => Promise<unknown> } }
  ).aBExperiment;
  if (!model) {
    return NextResponse.json([]);
  }

  const experiments = (await model.findMany({
    include: { bucketConfigs: true },
    orderBy: { createdAt: 'desc' },
  })) as ABExperimentRecord[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma groupBy typing mismatch with optional AB fields
  const conversationBuckets = (await (prisma.conversation.groupBy as any)({
    by: ['abExperimentId', 'abBucketLabel'],
    where: {
      abExperimentId: { not: null },
      abBucketLabel: { not: null },
    },
    _count: { _all: true },
  })) as BucketCount[];

  const bucketCountMap = new Map<string, number>();
  for (const row of conversationBuckets) {
    if (!row.abExperimentId || !row.abBucketLabel) continue;
    bucketCountMap.set(`${row.abExperimentId}:${row.abBucketLabel}`, row._count._all);
  }

  const data = await Promise.all(
    experiments.map(async (experiment) => {
      const buckets = await Promise.all(
        experiment.bucketConfigs.map(async (bucket) => {
          const sampleSize = bucketCountMap.get(`${experiment.id}:${bucket.bucketLabel}`) ?? 0;
          const conversations = (await prisma.conversation.findMany({
            where: {
              abExperimentId: experiment.id,
              abBucketLabel: bucket.bucketLabel,
            },
            select: { id: true, userId: true },
          })) as ConversationIdRow[];
          if (conversations.length === 0) {
            return {
              label: bucket.bucketLabel,
              sampleSize,
              avgTutorBenchScore: 0,
              avgTurnCount: 0,
              avgTurnLatencyMs: 0,
              avgStuckLoopCount: 0,
              avgRefusalCount: 0,
              successRate: 0,
            };
          }

          const userIds = [...new Set(conversations.map((row) => row.userId))];
          const metrics = (await prisma.sessionMetrics.aggregate({
            where: { userId: { in: userIds } },
            _avg: {
              turnCount: true,
              avgTurnLatencyMs: true,
              stuckLoopCount: true,
              refusalCount: true,
            },
          })) as SessionMetricsAggregate;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma groupBy typing mismatch
          const outcomes = (await (prisma.sessionMetrics.groupBy as any)({
            by: ['outcome'],
            where: { userId: { in: userIds } },
            _count: { _all: true },
          })) as SessionOutcomeGroup[];
          const successCount =
            outcomes.find((item) => item.outcome === 'success')?._count._all ?? 0;
          const successRate = roundOne((successCount / conversations.length) * 100);

          return {
            label: bucket.bucketLabel,
            sampleSize,
            avgTutorBenchScore: successRate,
            avgTurnCount: toMetric(metrics._avg.turnCount),
            avgTurnLatencyMs: toMetric(metrics._avg.avgTurnLatencyMs),
            avgStuckLoopCount: toMetric(metrics._avg.stuckLoopCount),
            avgRefusalCount: toMetric(metrics._avg.refusalCount),
            successRate,
          };
        }),
      );

      const qualityScores = buckets.map((bucket) => bucket.avgTutorBenchScore);
      const sampleSizes = buckets.map((bucket) => bucket.sampleSize);
      const bestBucket =
        buckets.length === 0
          ? null
          : buckets.reduce((best, current) =>
              current.avgTutorBenchScore > best.avgTutorBenchScore ? current : best,
            );

      return {
        id: experiment.id,
        name: experiment.name,
        status: experiment.status,
        startDate: experiment.startDate,
        endDate: experiment.endDate,
        buckets,
        comparison: {
          bestBucketLabel: bestBucket?.label ?? null,
          qualitySpread:
            qualityScores.length === 0
              ? 0
              : roundOne(Math.max(...qualityScores) - Math.min(...qualityScores)),
          sampleSizeSpread:
            sampleSizes.length === 0 ? 0 : Math.max(...sampleSizes) - Math.min(...sampleSizes),
        },
      };
    }),
  );

  return NextResponse.json(data);
});
