import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const TRIAL_RETENTION_DAYS = 30;
const NURTURING_RETENTION_DAYS = 90;

interface CleanupResult {
  deletedCount: number;
  skippedWithEmail: number;
  cutoffDate: Date;
  clearedMindmapsCount?: number;
}

/**
 * Clean up expired trial sessions (30-day retention)
 *
 * GDPR compliance: Trial data is retained for 30 days max.
 * Email retention never extends the lifetime of educational content.
 *
 * @returns {Promise<CleanupResult>} Statistics about the cleanup operation
 */
export async function cleanupExpiredTrialSessions(): Promise<CleanupResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - TRIAL_RETENTION_DAYS);

  const { count: clearedMindmapsCount } = await prisma.trialSession.updateMany({
    where: {
      createdAt: { lte: cutoffDate },
      NOT: { mindmaps: { equals: {} } },
    },
    data: { mindmaps: {}, mindmapRevision: { increment: 1 } },
  });

  // Count sessions with emails that would be skipped
  const skippedWithEmail = await prisma.trialSession.count({
    where: {
      createdAt: { lt: cutoffDate },
      email: { not: null },
    },
  });

  // Delete sessions older than 30 days WITHOUT email
  const { count: deletedCount } = await prisma.trialSession.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      email: null, // Only delete sessions without email
    },
  });

  logger.info('Trial session cleanup completed', {
    deletedCount,
    skippedWithEmail,
    clearedMindmapsCount,
    cutoffDate: cutoffDate.toISOString(),
    retentionDays: TRIAL_RETENTION_DAYS,
  });

  return {
    deletedCount,
    skippedWithEmail,
    clearedMindmapsCount,
    cutoffDate,
  };
}

/**
 * Clean up trial sessions WITH email after extended retention (90 days)
 *
 * For nurturing campaigns, we keep email sessions longer.
 * After 90 days, we anonymize them (remove email) rather than delete
 * to preserve usage statistics for analytics while respecting GDPR.
 *
 * @returns {Promise<CleanupResult>} Statistics about the anonymization operation
 */
export async function cleanupNurturingTrialSessions(): Promise<CleanupResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - NURTURING_RETENTION_DAYS);

  // For GDPR, we anonymize rather than delete (removes email but keeps usage stats)
  const { count: anonymizedCount } = await prisma.trialSession.updateMany({
    where: {
      createdAt: { lt: cutoffDate },
      email: { not: null },
    },
    data: {
      email: null,
      emailCollectedAt: null,
    },
  });

  logger.info('Trial nurturing data anonymized', {
    anonymizedCount,
    cutoffDate: cutoffDate.toISOString(),
    retentionDays: NURTURING_RETENTION_DAYS,
  });

  return {
    deletedCount: 0,
    skippedWithEmail: anonymizedCount,
    cutoffDate,
  };
}
