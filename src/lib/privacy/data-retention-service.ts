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
 *
 * TODO: Implement when UserPrivacyPreferences schema is added
 */
export async function getEffectiveRetentionPolicy(
  _userId: string
): Promise<DataRetentionPolicy> {
  // Return default until schema supports custom preferences
  return DEFAULT_RETENTION_POLICY;
}

/**
 * Mark data for deletion based on retention policy
 * Does not immediately delete - marks for cleanup job
 *
 * TODO: Implement when markedForDeletion field is added to schema
 */
export async function markExpiredDataForDeletion(
  userId: string
): Promise<{ conversations: number; embeddings: number }> {
  log.debug('markExpiredDataForDeletion called - awaiting schema migration', {
    userId: userId.slice(0, 8),
  });

  // Return zeros until schema supports marking
  return {
    conversations: 0,
    embeddings: 0,
  };
}

/**
 * Execute scheduled deletions (run by cleanup job)
 * Only deletes data that has been marked for > 30 days (grace period)
 *
 * TODO: Implement when markedForDeletion field is added to schema
 */
export async function executeScheduledDeletions(): Promise<{
  deletedConversations: number;
  deletedEmbeddings: number;
  deletedMessages: number;
}> {
  log.debug('executeScheduledDeletions called - awaiting schema migration');

  // Return zeros until schema supports scheduled deletion
  return {
    deletedConversations: 0,
    deletedEmbeddings: 0,
    deletedMessages: 0,
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
    const [totalConversations, oldestConversation] = await Promise.all([
      prisma.conversation.count({ where: { userId } }),
      prisma.conversation.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
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
 *
 * TODO: Implement when UserPrivacyPreferences schema is added
 */
export async function updateUserRetentionPolicy(
  userId: string,
  customPolicy: Partial<DataRetentionPolicy>
): Promise<void> {
  log.info('updateUserRetentionPolicy called - awaiting schema migration', {
    userId: userId.slice(0, 8),
    policy: customPolicy,
  });

  // No-op until schema supports custom preferences
}
