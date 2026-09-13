import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { recordStageTransition, hasStage } from './index';
import { logger } from '@/lib/logger';
import {
  hasStoredAnalyticsOptIn,
  isOptionalAnalyticsEligible,
} from '@/lib/telemetry/optional-analytics-server';

const log = logger.child({ module: 'batch-funnel' });
const BATCH_SIZE = 200;
const ACTIVE_THRESHOLD = 3;
const ACTIVE_WINDOW_DAYS = 7;
const CHURN_INACTIVITY_DAYS = 14;

export interface BatchFunnelResult {
  activeRecorded: number;
  churnedRecorded: number;
  errors: number;
}

async function* permittedUserBatches(): AsyncGenerator<string[]> {
  let after: string | undefined;
  for (;;) {
    const settings = await prisma.settings.findMany({
      select: { userId: true, azureCostConfig: true },
      orderBy: { userId: 'asc' },
      take: BATCH_SIZE,
      ...(after ? { where: { userId: { gt: after } } } : {}),
    });
    if (!Array.isArray(settings)) throw new Error('Invalid analytics consent page');
    if (!settings.length) return;
    const lastUserId = settings.at(-1)?.userId;
    if (!lastUserId || (after && lastUserId <= after))
      throw new Error('Invalid analytics consent cursor');
    const permitted: string[] = [];
    for (const setting of settings) {
      if (
        hasStoredAnalyticsOptIn(setting?.azureCostConfig) &&
        (await isOptionalAnalyticsEligible(setting?.userId))
      )
        permitted.push(setting.userId);
    }
    if (permitted.length) yield permitted;
    if (settings.length < BATCH_SIZE) return;
    after = lastUserId;
  }
}

async function processActiveBatch(permitted: string[]): Promise<number> {
  const windowStart = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const activeUsers = await prisma.$queryRaw<Array<{ userId: string; sessionCount: bigint }>>`
    SELECT "userId", COUNT(DISTINCT id) as "sessionCount"
    FROM "StudySession"
    WHERE "startedAt" >= ${windowStart}
      AND "isTestData" = false
      AND "userId" IN (${Prisma.join(permitted)})
    GROUP BY "userId"
    HAVING COUNT(DISTINCT id) >= ${ACTIVE_THRESHOLD}
  `;
  let recorded = 0;
  for (const user of activeUsers) {
    if (await hasStage({ userId: user.userId }, 'ACTIVE')) continue;
    try {
      const stored = await recordStageTransition({ userId: user.userId }, 'ACTIVE', {
        sessionCount: Number(user.sessionCount),
        windowDays: ACTIVE_WINDOW_DAYS,
        source: 'cron',
      });
      if (stored) recorded++;
    } catch (error) {
      log.warn('Failed to record ACTIVE event', { error: String(error) });
    }
  }
  return recorded;
}

async function processChurnedBatch(permitted: string[]): Promise<number> {
  const churnCutoff = new Date(Date.now() - CHURN_INACTIVITY_DAYS * 24 * 60 * 60 * 1000);
  const candidates = await prisma.$queryRaw<
    Array<{
      userId: string;
      stage: string;
      last_activity: Date;
    }>
  >`
    WITH latest AS (
      SELECT DISTINCT ON ("userId") "userId", stage, "createdAt" as last_activity
      FROM "FunnelEvent"
      WHERE "isTestData" = false
        AND "userId" IN (${Prisma.join(permitted)})
      ORDER BY "userId", "createdAt" DESC
    )
    SELECT "userId", stage, last_activity
    FROM latest
    WHERE last_activity < ${churnCutoff}
      AND stage NOT IN ('CHURNED', 'VISITOR')
  `;
  let recorded = 0;
  for (const candidate of candidates) {
    const identifier = { userId: candidate.userId };
    if (await hasStage(identifier, 'CHURNED')) continue;
    try {
      const stored = await recordStageTransition(identifier, 'CHURNED', {
        previousStage: candidate.stage,
        lastActivity: candidate.last_activity.toISOString(),
        inactivityDays: CHURN_INACTIVITY_DAYS,
        source: 'cron',
      });
      if (stored) recorded++;
    } catch (error) {
      log.warn('Failed to record CHURNED event', { error: String(error) });
    }
  }
  return recorded;
}

export async function processActiveUsers(): Promise<number> {
  let recorded = 0;
  for await (const permitted of permittedUserBatches())
    recorded += await processActiveBatch(permitted);
  return recorded;
}

export async function processChurnedUsers(): Promise<number> {
  let recorded = 0;
  for await (const permitted of permittedUserBatches())
    recorded += await processChurnedBatch(permitted);
  return recorded;
}

/** One bounded consent scan per cron run; the recorder still rechecks permission before each write. */
export async function processBatchFunnelEvents(): Promise<BatchFunnelResult> {
  const result: BatchFunnelResult = { activeRecorded: 0, churnedRecorded: 0, errors: 0 };
  try {
    for await (const permitted of permittedUserBatches()) {
      try {
        result.activeRecorded += await processActiveBatch(permitted);
      } catch (error) {
        log.error('Active funnel batch failed', { error: String(error) });
        result.errors++;
      }
      try {
        result.churnedRecorded += await processChurnedBatch(permitted);
      } catch (error) {
        log.error('Churned funnel batch failed', { error: String(error) });
        result.errors++;
      }
    }
  } catch (error) {
    log.error('Funnel consent pagination failed', { error: String(error) });
    result.errors++;
  }
  return result;
}
