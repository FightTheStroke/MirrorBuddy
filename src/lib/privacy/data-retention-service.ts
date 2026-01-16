/**
 * Data Retention Service
 * Part of Ethical Design Hardening (F-02)
 *
 * Manages data lifecycle, retention policies, and scheduled cleanup
 * for GDPR compliance (Art. 5 - storage limitation principle).
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  DataRetentionPolicy,
  DEFAULT_RETENTION_POLICY,
} from './types';

const log = logger.child({ module: 'data-retention' });

/**
 * Get effective retention policy for a user
 * Returns user's custom policy if set, otherwise default
 */
export async function getEffectiveRetentionPolicy(
  userId: string
): Promise<DataRetentionPolicy> {
  try {
    const prefs = await prisma.userPrivacyPreferences.findUnique({
      where: { userId },
    });

    if (prefs?.customRetention) {
      return {
        ...DEFAULT_RETENTION_POLICY,
        ...(prefs.customRetention as Partial<DataRetentionPolicy>),
      };
    }

    return DEFAULT_RETENTION_POLICY;
  } catch {
    // Table might not exist yet, return default
    return DEFAULT_RETENTION_POLICY;
  }
}

/**
 * Mark data for deletion based on retention policy
 * Does not immediately delete - marks for cleanup job
 */
export async function markExpiredDataForDeletion(
  userId: string
): Promise<{ conversations: number; embeddings: number }> {
  const policy = await getEffectiveRetentionPolicy(userId);
  const now = new Date();

  // Calculate cutoff dates
  const conversationCutoff = new Date(
    now.getTime() - policy.conversationTTLDays * 24 * 60 * 60 * 1000
  );
  const embeddingsCutoff = new Date(
    now.getTime() - policy.embeddingsTTLDays * 24 * 60 * 60 * 1000
  );

  let conversationsMarked = 0;
  let embeddingsMarked = 0;

  try {
    // Mark old conversations
    const convResult = await prisma.conversation.updateMany({
      where: {
        userId,
        createdAt: { lt: conversationCutoff },
        markedForDeletion: false,
      },
      data: {
        markedForDeletion: true,
        deletionScheduledAt: now,
      },
    });
    conversationsMarked = convResult.count;

    // Mark old embeddings
    const embResult = await prisma.embedding.updateMany({
      where: {
        userId,
        createdAt: { lt: embeddingsCutoff },
        markedForDeletion: false,
      },
      data: {
        markedForDeletion: true,
        deletionScheduledAt: now,
      },
    });
    embeddingsMarked = embResult.count;

    log.info('Marked expired data for deletion', {
      userId: userId.slice(0, 8),
      conversationsMarked,
      embeddingsMarked,
    });
  } catch (error) {
    // Tables might not have these columns yet
    log.debug('Retention marking skipped - schema update needed', { error });
  }

  return {
    conversations: conversationsMarked,
    embeddings: embeddingsMarked,
  };
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
  const gracePeriodDays = 30;
  const cutoff = new Date(
    Date.now() - gracePeriodDays * 24 * 60 * 60 * 1000
  );

  let deletedConversations = 0;
  let deletedEmbeddings = 0;
  let deletedMessages = 0;

  try {
    // Delete messages from marked conversations first
    const msgResult = await prisma.message.deleteMany({
      where: {
        conversation: {
          markedForDeletion: true,
          deletionScheduledAt: { lt: cutoff },
        },
      },
    });
    deletedMessages = msgResult.count;

    // Delete marked conversations
    const convResult = await prisma.conversation.deleteMany({
      where: {
        markedForDeletion: true,
        deletionScheduledAt: { lt: cutoff },
      },
    });
    deletedConversations = convResult.count;

    // Delete marked embeddings
    const embResult = await prisma.embedding.deleteMany({
      where: {
        markedForDeletion: true,
        deletionScheduledAt: { lt: cutoff },
      },
    });
    deletedEmbeddings = embResult.count;

    log.info('Executed scheduled deletions', {
      deletedConversations,
      deletedEmbeddings,
      deletedMessages,
    });
  } catch (error) {
    log.error('Failed to execute scheduled deletions', { error });
  }

  return {
    deletedConversations,
    deletedEmbeddings,
    deletedMessages,
  };
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
    const [
      totalConversations,
      markedForDeletion,
      oldestConversation,
      totalEmbeddings,
    ] = await Promise.all([
      prisma.conversation.count({ where: { userId } }),
      prisma.conversation.count({
        where: { userId, markedForDeletion: true },
      }),
      prisma.conversation.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      prisma.embedding.count({ where: { userId } }),
    ]);

    return {
      policy,
      dataStats: {
        totalConversations,
        markedForDeletion,
        oldestConversation: oldestConversation?.createdAt || null,
        totalEmbeddings,
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
  customPolicy: Partial<DataRetentionPolicy>
): Promise<void> {
  await prisma.userPrivacyPreferences.upsert({
    where: { userId },
    create: {
      userId,
      pseudonymizedMode: false,
      customRetention: customPolicy,
      consentedAt: new Date(),
      updatedAt: new Date(),
    },
    update: {
      customRetention: customPolicy,
      updatedAt: new Date(),
    },
  });

  log.info('Updated user retention policy', {
    userId: userId.slice(0, 8),
    policy: customPolicy,
  });
}
