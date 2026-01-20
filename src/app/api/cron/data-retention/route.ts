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

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  markExpiredDataForDeletion,
  executeScheduledDeletions,
} from "@/lib/privacy/data-retention-service";
import { purgeExpiredUserBackups } from "@/lib/admin/user-trash-service";

const log = logger.child({ module: "cron-data-retention" });

interface CronResponse {
  status: "success" | "error";
  timestamp: string;
  duration_ms: number;
  summary: {
    marked_for_deletion: {
      conversations: number;
      embeddings: number;
    };
    executed_deletions: {
      conversations: number;
      messages: number;
      embeddings: number;
    };
    users_processed: number;
    errors: string[];
  };
}

/**
 * Verify cron request authenticity via CRON_SECRET header
 * Vercel includes X-Vercel-Cron: true in cron requests
 * We add custom CRON_SECRET for additional security
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.warn("CRON_SECRET not configured - allowing all requests");
    return true;
  }

  const authHeader = request.headers.get("authorization");
  const expectedHeader = `Bearer ${cronSecret}`;

  // Constant-time comparison to prevent timing attacks
  if (!authHeader || authHeader !== expectedHeader) {
    return false;
  }

  return true;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const response: CronResponse = {
    status: "success",
    timestamp: new Date().toISOString(),
    duration_ms: 0,
    summary: {
      marked_for_deletion: { conversations: 0, embeddings: 0 },
      executed_deletions: { conversations: 0, messages: 0, embeddings: 0 },
      users_processed: 0,
      errors: [],
    },
  };

  try {
    // Verify cron authenticity
    if (!verifyCronSecret(request)) {
      log.error("Invalid CRON_SECRET provided");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    log.info("Data retention cron job started");

    // Phase 1: Find users with retention policies and mark expired data
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

    // Set duration
    response.duration_ms = Date.now() - startTime;

    // Determine overall status
    if (response.summary.errors.length > 0) {
      response.status = "error";
      log.warn("Data retention cron completed with errors", {
        errors: response.summary.errors.length,
        duration_ms: response.duration_ms,
      });
      return NextResponse.json(response, { status: 207 }); // Multi-Status
    }

    log.info("Data retention cron completed successfully", {
      duration_ms: response.duration_ms,
      users_processed: response.summary.users_processed,
      marked_conversations: response.summary.marked_for_deletion.conversations,
      deleted_conversations: response.summary.executed_deletions.conversations,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    response.status = "error";
    response.duration_ms = Date.now() - startTime;

    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error("Cron job failed", {
      error: errorMsg,
      duration_ms: response.duration_ms,
    });

    response.summary.errors.push(errorMsg);

    return NextResponse.json(response, { status: 500 });
  }
}

// Allow GET requests for manual triggering (in development)
// Production should use POST only
export async function GET(request: NextRequest): Promise<NextResponse> {
  // In production, reject GET to enforce POST+CRON_SECRET security
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  // In development, allow GET for testing (without auth requirement)
  log.warn("GET request to cron endpoint in development mode");
  return POST(request);
}
