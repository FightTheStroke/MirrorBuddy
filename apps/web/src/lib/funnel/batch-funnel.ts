/**
 * Batch Funnel Processing
 * Detects ACTIVE and CHURNED users for cron-based funnel event recording.
 * Called from metrics-push cron to write FunnelEvent records.
 */

import { prisma } from '@/lib/db';
import { recordStageTransition, hasStage } from './index';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'batch-funnel' });

const ACTIVE_THRESHOLD = 3;
const ACTIVE_WINDOW_DAYS = 7;
const CHURN_INACTIVITY_DAYS = 14;

export interface BatchFunnelResult {
  activeRecorded: number;
  churnedRecorded: number;
  errors: number;
}

/**
 * Detect and record ACTIVE users (>=3 study sessions in 7 days)
 */
export async function processActiveUsers(): Promise<number> {
  const windowStart = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const activeUsers = await prisma.$queryRaw<Array<{ userId: string; sessionCount: bigint }>>`
    SELECT "userId", COUNT(DISTINCT id) as "sessionCount"
    FROM "StudySession"
    WHERE "startedAt" >= ${windowStart}
      AND "isTestData" = false
    GROUP BY "userId"
    HAVING COUNT(DISTINCT id) >= ${ACTIVE_THRESHOLD}
  `;

  let recorded = 0;
  for (const user of activeUsers) {
    const alreadyActive = await hasStage({ userId: user.userId }, 'ACTIVE');
    if (alreadyActive) continue;

    try {
      await recordStageTransition({ userId: user.userId }, 'ACTIVE', {
        sessionCount: Number(user.sessionCount),
        windowDays: ACTIVE_WINDOW_DAYS,
        source: 'cron',
      });
      recorded++;
    } catch (err) {
      log.warn('Failed to record ACTIVE event', {
        userId: user.userId,
        error: String(err),
      });
    }
  }
  return recorded;
}

/**
 * Detect and record CHURNED users (no activity > 14 days)
 */
export async function processChurnedUsers(): Promise<number> {
  const churnCutoff = new Date(Date.now() - CHURN_INACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  const churnCandidates = await prisma.$queryRaw<
    Array<{
      user_key: string;
      stage: string;
      last_activity: Date;
      is_user: boolean;
    }>
  >`
    WITH latest AS (
      SELECT DISTINCT ON (COALESCE("userId", "visitorId"))
        COALESCE("userId", "visitorId") as user_key,
        stage,
        "createdAt" as last_activity,
        "userId" IS NOT NULL as is_user
      FROM "FunnelEvent"
      WHERE "isTestData" = false
      ORDER BY COALESCE("userId", "visitorId"), "createdAt" DESC
    )
    SELECT user_key, stage, last_activity, is_user
    FROM latest
    WHERE last_activity < ${churnCutoff}
      AND stage NOT IN ('CHURNED', 'VISITOR')
  `;

  let recorded = 0;
  for (const candidate of churnCandidates) {
    const identifier = candidate.is_user
      ? { userId: candidate.user_key }
      : { visitorId: candidate.user_key };

    const alreadyChurned = await hasStage(identifier, 'CHURNED');
    if (alreadyChurned) continue;

    try {
      await recordStageTransition(identifier, 'CHURNED', {
        previousStage: candidate.stage,
        lastActivity: candidate.last_activity.toISOString(),
        inactivityDays: CHURN_INACTIVITY_DAYS,
        source: 'cron',
      });
      recorded++;
    } catch (err) {
      log.warn('Failed to record CHURNED event', {
        userKey: candidate.user_key,
        error: String(err),
      });
    }
  }
  return recorded;
}

/**
 * Run all batch funnel processing
 */
export async function processBatchFunnelEvents(): Promise<BatchFunnelResult> {
  let activeRecorded = 0;
  let churnedRecorded = 0;
  let errors = 0;

  try {
    activeRecorded = await processActiveUsers();
  } catch (err) {
    log.error('processActiveUsers failed', { error: String(err) });
    errors++;
  }

  try {
    churnedRecorded = await processChurnedUsers();
  } catch (err) {
    log.error('processChurnedUsers failed', { error: String(err) });
    errors++;
  }

  return { activeRecorded, churnedRecorded, errors };
}
