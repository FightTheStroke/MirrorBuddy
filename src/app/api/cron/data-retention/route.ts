/**
 * Data Retention Cron Job Handler
 * Part of Ethical Design Hardening (F-15)
 *
 * Scheduled task for automated data cleanup per GDPR compliance
 * Runs daily via Vercel Cron (0 3 * * * = 3 AM UTC)
 *
 * Two-phase approach:
 * 1. Mark expired data for deletion (based on retention policies)
 * 2. Execute scheduled deletions (after grace period)
 */

import { pipe, withSentry, withCron } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  markExpiredDataForDeletion,
  executeScheduledDeletions,
  applyDefaultRetentionSystemWide,
} from "@/lib/privacy/data-retention-service";
import { purgeExpiredUserBackups } from "@/lib/admin/user-trash-service";
import {
  cleanupExpiredTrialSessions,
  cleanupNurturingTrialSessions,
} from "@/lib/trial/trial-cleanup";

const log = logger.child({ module: "cron-data-retention" });

interface CronResponse {
  status: "success" | "error";
  timestamp: string;
  duration_ms: number;
  summary: {
    default_retention: {
      conversations_marked: number;
    };
    marked_for_deletion: {
      conversations: number;
      embeddings: number;
    };
    executed_deletions: {
      conversations: number;
      messages: number;
      embeddings: number;
    };
    trial_sessions: {
      deleted: number;
      anonymized: number;
    };
    users_processed: number;
    errors: string[];
  };
}

export const POST = pipe(
  withSentry("/api/cron/data-retention"),
  withCron,
)(async () => {
  const startTime = Date.now();
  const response: CronResponse = {
    status: "success",
    timestamp: new Date().toISOString(),
    duration_ms: 0,
    summary: {
      default_retention: { conversations_marked: 0 },
      marked_for_deletion: { conversations: 0, embeddings: 0 },
      executed_deletions: { conversations: 0, messages: 0, embeddings: 0 },
      trial_sessions: { deleted: 0, anonymized: 0 },
      users_processed: 0,
      errors: [],
    },
  };

  // Skip cron in non-production environments (staging/preview)
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    log.info(
      `[CRON] Skipping data-retention - not production (env: ${process.env.VERCEL_ENV})`,
    );
    return Response.json(
      {
        skipped: true,
        reason: "Not production environment",
        environment: process.env.VERCEL_ENV,
      },
      { status: 200 },
    );
  }

  log.info("Data retention cron job started");

  // Phase 0: Apply default retention to ALL users (GDPR Art. 5)
  // This ensures conversations older than default TTL are marked for deletion
  // regardless of whether users have custom policies
  try {
    const defaultResult = await applyDefaultRetentionSystemWide();
    response.summary.default_retention.conversations_marked =
      defaultResult.conversationsMarked;

    if (defaultResult.conversationsMarked > 0) {
      log.info("Default retention applied system-wide", {
        conversationsMarked: defaultResult.conversationsMarked,
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error("Failed to apply default retention", { error: errorMsg });
    response.summary.errors.push(`Default retention: ${errorMsg}`);
  }

  // Phase 1: Find users with CUSTOM retention policies (shorter TTL than default)
  // These users want data deleted sooner than the default 365 days
  const usersWithPolicies = await prisma.userPrivacyPreferences.findMany({
    where: {
      customRetention: { not: null },
    },
    select: { userId: true },
  });

  log.info("Processing users with retention policies", {
    count: usersWithPolicies.length,
  });

  // Mark expired data for each user
  for (const user of usersWithPolicies) {
    try {
      const marked = await markExpiredDataForDeletion(user.userId);
      response.summary.marked_for_deletion.conversations +=
        marked.conversations;
      response.summary.marked_for_deletion.embeddings += marked.embeddings;
      response.summary.users_processed += 1;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error("Failed to mark data for user", {
        userId: user.userId.slice(0, 8),
        error: errorMsg,
      });
      response.summary.errors.push(
        `User ${user.userId.slice(0, 8)}: ${errorMsg}`,
      );
    }
  }

  // Phase 2: Execute scheduled deletions
  // This happens for all users (not just those with custom policies)
  try {
    const deletionResult = await executeScheduledDeletions();
    response.summary.executed_deletions.conversations =
      deletionResult.deletedConversations;
    response.summary.executed_deletions.messages =
      deletionResult.deletedMessages;
    response.summary.executed_deletions.embeddings =
      deletionResult.deletedEmbeddings;

    log.info("Scheduled deletions executed", {
      conversations: deletionResult.deletedConversations,
      messages: deletionResult.deletedMessages,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error("Failed to execute scheduled deletions", { error: errorMsg });
    response.summary.errors.push(`Deletion execution: ${errorMsg}`);
  }

  // Phase 3: Purge expired user backups (30-day retention)
  try {
    const purged = await purgeExpiredUserBackups();
    if (purged > 0) {
      log.info("User backups purged", { purged });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error("Failed to purge user backups", { error: errorMsg });
    response.summary.errors.push(`Backup purge: ${errorMsg}`);
  }

  // Phase 4: Cleanup expired trial sessions (F-01)
  // 4a: Delete sessions WITHOUT email after 30 days
  try {
    const deletionResult = await cleanupExpiredTrialSessions();
    response.summary.trial_sessions.deleted = deletionResult.deletedCount;

    if (deletionResult.deletedCount > 0) {
      log.info("Trial sessions deleted (30-day)", {
        deleted: deletionResult.deletedCount,
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error("Failed to cleanup trial sessions", { error: errorMsg });
    response.summary.errors.push(`Trial cleanup: ${errorMsg}`);
  }

  // 4b: Anonymize sessions WITH email after 90 days (nurturing)
  try {
    const anonymizeResult = await cleanupNurturingTrialSessions();
    // skippedWithEmail in this context = sessions that were anonymized
    response.summary.trial_sessions.anonymized =
      anonymizeResult.skippedWithEmail;

    if (anonymizeResult.skippedWithEmail > 0) {
      log.info("Trial sessions anonymized (90-day nurturing)", {
        anonymized: anonymizeResult.skippedWithEmail,
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error("Failed to anonymize nurturing sessions", { error: errorMsg });
    response.summary.errors.push(`Nurturing anonymize: ${errorMsg}`);
  }

  // Set duration
  response.duration_ms = Date.now() - startTime;

  // Determine overall status
  if (response.summary.errors.length > 0) {
    response.status = "error";
    log.warn("Data retention cron completed with errors", {
      errors: response.summary.errors.length,
      duration_ms: response.duration_ms,
    });
    return Response.json(response, { status: 207 }); // Multi-Status
  }

  log.info("Data retention cron completed successfully", {
    duration_ms: response.duration_ms,
    default_marked: response.summary.default_retention.conversations_marked,
    users_processed: response.summary.users_processed,
    custom_marked: response.summary.marked_for_deletion.conversations,
    deleted_conversations: response.summary.executed_deletions.conversations,
    trial_deleted: response.summary.trial_sessions.deleted,
    trial_anonymized: response.summary.trial_sessions.anonymized,
  });

  return Response.json(response, { status: 200 });
});

// Vercel Cron uses GET by default
export const GET = POST;
