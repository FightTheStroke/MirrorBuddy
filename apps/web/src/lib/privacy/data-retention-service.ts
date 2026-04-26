/**
 * Data Retention Service
 * Part of Ethical Design Hardening (F-02)
 *
 * Manages data lifecycle, retention policies, and scheduled cleanup
 * for GDPR compliance (Art. 5 - storage limitation principle).
 *
 * NOTE: Full implementation requires schema migration to add:
 * - UserPrivacyPreferences model
 * - markedForDeletion field on Conversation
 * - Embedding model
 *
 * Current implementation provides stubbed functions that return defaults.
 */

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { DataRetentionPolicy, DEFAULT_RETENTION_POLICY } from "./types";

const log = logger.child({ module: "data-retention" });

/**
 * Get effective retention policy for a user
 * Returns user's custom policy if set, otherwise default
 */
export async function getEffectiveRetentionPolicy(
  userId: string,
): Promise<DataRetentionPolicy> {
  try {
    const userPreferences = await prisma.userPrivacyPreferences.findUnique({
      where: { userId },
      select: { customRetention: true },
    });

    // If user has custom retention policy, merge with defaults
    if (userPreferences?.customRetention) {
      const customPolicy = JSON.parse(
        userPreferences.customRetention,
      ) as Partial<DataRetentionPolicy>;
      return {
        ...DEFAULT_RETENTION_POLICY,
        ...customPolicy,
      };
    }

    // Return default if no custom policy found
    return DEFAULT_RETENTION_POLICY;
  } catch (error) {
    log.warn("Failed to fetch user retention policy", {
      userId: userId.slice(0, 8),
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return DEFAULT_RETENTION_POLICY;
  }
}

/**
 * Mark data for deletion based on retention policy
 * Does not immediately delete - marks for cleanup job
 */
export async function markExpiredDataForDeletion(
  userId: string,
): Promise<{ conversations: number; embeddings: number }> {
  try {
    const policy = await getEffectiveRetentionPolicy(userId);

    // Calculate cutoff date based on conversation TTL
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.conversationTTLDays);

    log.debug("Marking expired conversations for deletion", {
      userId: userId.slice(0, 8),
      cutoffDate,
      ttlDays: policy.conversationTTLDays,
    });

    // Mark conversations older than cutoff date
    const result = await prisma.conversation.updateMany({
      where: {
        userId,
        createdAt: { lt: cutoffDate },
        markedForDeletion: false,
      },
      data: {
        markedForDeletion: true,
        markedForDeletionAt: new Date(),
      },
    });

    log.info("Conversations marked for deletion", {
      userId: userId.slice(0, 8),
      count: result.count,
    });

    return {
      conversations: result.count,
      embeddings: 0, // Embeddings marking pending schema migration
    };
  } catch (error) {
    log.error("Error marking expired data for deletion", {
      userId: userId.slice(0, 8),
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

/**
 * Execute scheduled deletions (run by cleanup job)
 * Only deletes data that has been marked for > 30 days (grace period)
 */
export async function executeScheduledDeletions(): Promise<{
  deletedConversations: number;
  deletedEmbeddings: number;
  deletedMessages: number;
}> {
  // Calculate grace period cutoff (30 days ago)
  const gracePeriodCutoff = new Date();
  gracePeriodCutoff.setDate(gracePeriodCutoff.getDate() - 30);

  try {
    // Use transaction for atomic deletion across multiple models
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Find conversations marked for deletion beyond grace period
        const conversationsToDelete = await tx.conversation.findMany({
          where: {
            markedForDeletion: true,
            markedForDeletionAt: {
              lt: gracePeriodCutoff,
            },
          },
          select: { id: true },
        });

        const conversationIds = conversationsToDelete.map((c) => c.id);

        if (conversationIds.length === 0) {
          return {
            deletedConversations: 0,
            deletedMessages: 0,
            deletedEmbeddings: 0,
          };
        }

        // Delete tool outputs (before conversation due to foreign keys)
        await tx.toolOutput.deleteMany({
          where: {
            conversationId: {
              in: conversationIds,
            },
          },
        });

        // Delete messages (cascaded by schema, but explicit for clarity)
        const messagesResult = await tx.message.deleteMany({
          where: {
            conversationId: {
              in: conversationIds,
            },
          },
        });

        // Delete conversations
        const conversationsResult = await tx.conversation.deleteMany({
          where: {
            id: {
              in: conversationIds,
            },
          },
        });

        return {
          deletedConversations: conversationsResult.count,
          deletedMessages: messagesResult.count,
          deletedEmbeddings: 0, // Embeddings schema pending
        };
      },
    );

    log.info("Scheduled deletions executed", {
      deletedConversations: result.deletedConversations,
      deletedMessages: result.deletedMessages,
      gracePeriodDays: 30,
      gracePeriodCutoff: gracePeriodCutoff.toISOString(),
    });

    return result;
  } catch (error) {
    log.error("Failed to execute scheduled deletions", { error });
    throw error;
  }
}

/**
 * Apply default retention policy to conversations for users WITHOUT custom policies.
 * Users with custom retention policies are handled separately by markExpiredDataForDeletion()
 * to respect their configured TTL (which may be longer than the default).
 *
 * GDPR Art. 5 requires storage limitation - data must not be kept indefinitely.
 */
export async function applyDefaultRetentionSystemWide(): Promise<{
  conversationsMarked: number;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(
    cutoffDate.getDate() - DEFAULT_RETENTION_POLICY.conversationTTLDays,
  );

  log.info("Applying default retention policy system-wide", {
    cutoffDate: cutoffDate.toISOString(),
    ttlDays: DEFAULT_RETENTION_POLICY.conversationTTLDays,
  });

  try {
    // Get user IDs that have custom retention policies - exclude them
    const usersWithCustomPolicies =
      await prisma.userPrivacyPreferences.findMany({
        where: { customRetention: { not: null } },
        select: { userId: true },
      });
    const excludedUserIds = usersWithCustomPolicies.map(
      (u: { userId: string }) => u.userId,
    );

    log.debug("Excluding users with custom policies from default retention", {
      excludedCount: excludedUserIds.length,
    });

    // Mark conversations older than default TTL, excluding users with custom policies
    const result = await prisma.conversation.updateMany({
      where: {
        createdAt: { lt: cutoffDate },
        markedForDeletion: false,
        // Exclude users who have custom retention policies
        userId: { notIn: excludedUserIds },
      },
      data: {
        markedForDeletion: true,
        markedForDeletionAt: new Date(),
      },
    });

    log.info("Default retention applied system-wide", {
      conversationsMarked: result.count,
      cutoffDate: cutoffDate.toISOString(),
      usersExcluded: excludedUserIds.length,
    });

    return { conversationsMarked: result.count };
  } catch (error) {
    log.error("Failed to apply default retention system-wide", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get retention status for a user (for transparency dashboard)
 */
export async function getUserRetentionStatus(userId: string): Promise<{
  policy: DataRetentionPolicy;
  dataStats: {
    totalConversations: number;
    markedForDeletion: number;
    oldestConversation: Date | null;
    totalEmbeddings: number;
  };
}> {
  const policy = await getEffectiveRetentionPolicy(userId);

  try {
    const [totalConversations, oldestConversation] = await Promise.all([
      prisma.conversation.count({ where: { userId } }),
      prisma.conversation.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
    ]);

    return {
      policy,
      dataStats: {
        totalConversations,
        markedForDeletion: 0, // Not tracked until schema migration
        oldestConversation: oldestConversation?.createdAt || null,
        totalEmbeddings: 0, // Not tracked until schema migration
      },
    };
  } catch {
    return {
      policy,
      dataStats: {
        totalConversations: 0,
        markedForDeletion: 0,
        oldestConversation: null,
        totalEmbeddings: 0,
      },
    };
  }
}

/**
 * Update user's retention preferences
 */
export async function updateUserRetentionPolicy(
  userId: string,
  customPolicy: Partial<DataRetentionPolicy>,
): Promise<void> {
  try {
    await prisma.userPrivacyPreferences.upsert({
      where: { userId },
      create: {
        userId,
        pseudonymizedMode: false,
        customRetention: JSON.stringify(customPolicy),
        consentedAt: new Date(),
      },
      update: {
        customRetention: JSON.stringify(customPolicy),
      },
    });

    log.info("User retention policy updated", {
      userId: userId.slice(0, 8),
      policy: customPolicy,
    });
  } catch (error) {
    log.error("Failed to update user retention policy", {
      userId: userId.slice(0, 8),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
