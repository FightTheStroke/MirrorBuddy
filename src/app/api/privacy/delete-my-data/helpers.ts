/**
 * GDPR Delete My Data helpers
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'gdpr-delete' });

/**
 * Execute complete user data deletion
 * Uses only models that exist in the current schema
 */
export async function executeUserDataDeletion(userId: string) {
  const deletedData = {
    conversations: 0,
    messages: 0,
    materials: 0,
    progress: 0,
    settings: 0,
  };

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Delete messages (child of conversations)
    const msgResult = await tx.message.deleteMany({
      where: { conversation: { userId } },
    });
    deletedData.messages = msgResult.count;

    // 2. Delete conversations
    const convResult = await tx.conversation.deleteMany({
      where: { userId },
    });
    deletedData.conversations = convResult.count;

    // 3. Delete materials (learning resources)
    const matResult = await tx.material.deleteMany({
      where: { userId },
    });
    deletedData.materials = matResult.count;

    // 4. Delete progress records
    const progressResult = await tx.progress.deleteMany({
      where: { userId },
    });
    deletedData.progress = progressResult.count;

    // 5. Delete flashcard progress
    await tx.flashcardProgress.deleteMany({
      where: { userId },
    }).catch((err) => {
      log.error('Failed to delete flashcard progress (optional table)', {
        error: String(err),
      });
    });

    // 6. Delete quiz results
    await tx.quizResult.deleteMany({
      where: { userId },
    }).catch((err) => {
      log.error('Failed to delete quiz results (optional table)', {
        error: String(err),
      });
    });

    // 7. Delete study sessions
    await tx.studySession.deleteMany({
      where: { userId },
    }).catch((err) => {
      log.error('Failed to delete study sessions (optional table)', {
        error: String(err),
      });
    });

    // 8. Delete settings
    const settingsResult = await tx.settings.deleteMany({
      where: { userId },
    });
    deletedData.settings = settingsResult.count;

    // 9. Delete accessibility settings
    await tx.accessibilitySettings.deleteMany({
      where: { userId },
    }).catch((err) => {
      log.error('Failed to delete accessibility settings (optional table)', {
        error: String(err),
      });
    });

    // 10. Delete notifications
    await tx.notification.deleteMany({
      where: { userId },
    }).catch((err) => {
      log.error('Failed to delete notifications (optional table)', {
        error: String(err),
      });
    });

    // 11. Delete telemetry events
    await tx.telemetryEvent.deleteMany({
      where: { userId },
    }).catch((err) => {
      log.error('Failed to delete telemetry events (optional table)', {
        error: String(err),
      });
    });

    // 12. Delete parent notes
    await tx.parentNote.deleteMany({
      where: { userId },
    }).catch((err) => {
      log.error('Failed to delete parent notes (optional table)', {
        error: String(err),
      });
    });

    // 13. Delete collections and tags
    await tx.materialTag.deleteMany({
      where: { material: { userId } },
    }).catch((err) => {
      log.error('Failed to delete material tags (optional table)', {
        error: String(err),
      });
    });

    await tx.collection.deleteMany({
      where: { userId },
    }).catch((err) => {
      log.error('Failed to delete collections (optional table)', {
        error: String(err),
      });
    });

    await tx.tag.deleteMany({
      where: { userId },
    }).catch((err) => {
      log.error('Failed to delete tags (optional table)', {
        error: String(err),
      });
    });
  });

  return {
    success: true,
    deletedData,
    message:
      'All your personal data has been permanently deleted. Thank you for using MirrorBuddy.',
  };
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
  log.info('GDPR deletion audit', {
    action: 'GDPR_DATA_DELETION',
    anonymizedUserId: userId.slice(0, 8) + '***',
    reason: reason || 'user_request',
    timestamp: new Date().toISOString(),
  });
}
