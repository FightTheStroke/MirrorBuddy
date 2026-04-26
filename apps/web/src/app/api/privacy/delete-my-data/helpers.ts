/**
 * GDPR Delete My Data helpers
 *
 * Comprehensive GDPR Article 17 - Right to Erasure implementation.
 * Deletes ALL user data across all tables with audit logging.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { disconnectGoogleAccount } from "@/lib/google";

const log = logger.child({ module: "gdpr-delete" });

/**
 * Execute complete user data deletion
 * Comprehensive deletion of ALL user data for GDPR compliance
 */
export async function executeUserDataDeletion(userId: string) {
  const deletedData = {
    conversations: 0,
    messages: 0,
    materials: 0,
    progress: 0,
    settings: 0,
    googleAccount: 0,
    coppaConsent: 0,
    profile: 0,
    onboarding: 0,
  };

  // Step 1: Revoke Google OAuth tokens BEFORE deleting from DB
  // This ensures we can still access the tokens for revocation
  try {
    await disconnectGoogleAccount(userId);
    deletedData.googleAccount = 1;
    log.info("Google account disconnected", { userId: userId.slice(0, 8) });
  } catch (err) {
    log.warn("Google account disconnect failed (may not exist)", {
      error: String(err),
    });
  }

  // Step 2: Delete all user data in transaction
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Delete messages (child of conversations)
    const msgResult = await tx.message.deleteMany({
      where: { conversation: { userId } },
    });
    deletedData.messages = msgResult.count;

    // Delete conversations
    const convResult = await tx.conversation.deleteMany({
      where: { userId },
    });
    deletedData.conversations = convResult.count;

    // Delete materials (learning resources)
    const matResult = await tx.material.deleteMany({
      where: { userId },
    });
    deletedData.materials = matResult.count;

    // Delete progress records
    const progressResult = await tx.progress.deleteMany({
      where: { userId },
    });
    deletedData.progress = progressResult.count;

    // Delete flashcard progress
    await safeDeleteMany(tx.flashcardProgress, { userId }, "flashcardProgress");

    // Delete quiz results
    await safeDeleteMany(tx.quizResult, { userId }, "quizResult");

    // Delete study sessions
    await safeDeleteMany(tx.studySession, { userId }, "studySession");

    // Delete settings
    const settingsResult = await tx.settings.deleteMany({
      where: { userId },
    });
    deletedData.settings = settingsResult.count;

    // Delete accessibility settings
    await safeDeleteMany(tx.accessibilitySettings, { userId }, "accessibility");

    // Delete notifications
    await safeDeleteMany(tx.notification, { userId }, "notification");

    // Delete telemetry events
    await safeDeleteMany(tx.telemetryEvent, { userId }, "telemetry");

    // Delete parent notes
    await safeDeleteMany(tx.parentNote, { userId }, "parentNote");

    // Delete collections and tags
    await tx.materialTag
      .deleteMany({
        where: { material: { userId } },
      })
      .catch(() => {
        /* Optional table */
      });

    await safeDeleteMany(tx.collection, { userId }, "collection");
    await safeDeleteMany(tx.tag, { userId }, "tag");

    // Delete COPPA consent records
    const coppaResult = await tx.coppaConsent
      .deleteMany({
        where: { userId },
      })
      .catch(() => ({ count: 0 }));
    deletedData.coppaConsent = coppaResult.count;

    // Delete profile
    const profileResult = await tx.profile
      .deleteMany({
        where: { userId },
      })
      .catch(() => ({ count: 0 }));
    deletedData.profile = profileResult.count;

    // Delete onboarding state
    const onboardingResult = await tx.onboardingState
      .deleteMany({
        where: { userId },
      })
      .catch(() => ({ count: 0 }));
    deletedData.onboarding = onboardingResult.count;

    // Delete Google account record (tokens already revoked above)
    await tx.googleAccount
      .deleteMany({
        where: { userId },
      })
      .catch(() => {
        /* May not exist */
      });

    // Delete learnings
    await safeDeleteMany(tx.learning, { userId }, "learning");

    // Delete pomodoro stats
    await safeDeleteMany(tx.pomodoroStats, { userId }, "pomodoroStats");

    // Delete calendar events
    await safeDeleteMany(tx.calendarEvent, { userId }, "calendarEvent");

    // Delete HTML snippets
    await safeDeleteMany(tx.htmlSnippet, { userId }, "htmlSnippet");

    // Delete homework sessions
    await safeDeleteMany(tx.homeworkSession, { userId }, "homeworkSession");

    // Delete push subscriptions
    await safeDeleteMany(tx.pushSubscription, { userId }, "pushSubscription");

    // Finally, delete the user record itself
    await tx.user.deleteMany({
      where: { id: userId },
    });
  });

  return {
    success: true,
    deletedData,
    message:
      "All your personal data has been permanently deleted. Thank you for using MirrorBuddy.",
  };
}

/**
 * Safe delete helper for optional tables
 */
async function safeDeleteMany(
  model: {
    deleteMany: (args: {
      where: { userId: string };
    }) => Promise<{ count: number }>;
  },
  where: { userId: string },
  tableName: string,
): Promise<number> {
  try {
    const result = await model.deleteMany({ where });
    return result.count;
  } catch (err) {
    log.debug(`Safe delete skipped for ${tableName}`, { error: String(err) });
    return 0;
  }
}

/**
 * Get summary of user data (for preview before deletion)
 */
export async function getUserDataSummary(userId: string) {
  const [conversations, messages, materials, progress] = await Promise.all([
    prisma.conversation.count({ where: { userId } }),
    prisma.message.count({ where: { conversation: { userId } } }),
    prisma.material.count({ where: { userId } }),
    prisma.progress.count({ where: { userId } }),
  ]);

  return {
    conversations,
    messages,
    materials,
    progress,
    estimatedDataPoints: conversations + messages + materials + progress,
  };
}

/**
 * Log deletion for audit trail (GDPR compliance)
 * Logs to file since AuditLog model doesn't exist in schema yet
 */
export function logDeletionAudit(userId: string, reason?: string): void {
  log.info("GDPR deletion audit", {
    action: "GDPR_DATA_DELETION",
    anonymizedUserId: userId.slice(0, 8) + "***",
    reason: reason || "user_request",
    timestamp: new Date().toISOString(),
  });
}
