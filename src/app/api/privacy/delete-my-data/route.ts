/**
 * GDPR Delete My Data API
 * Part of Ethical Design Hardening (F-03)
 *
 * Implements GDPR Article 17 - Right to Erasure
 * Allows users to request complete deletion of their personal data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { cookies } from 'next/headers';

const log = logger.child({ module: 'gdpr-delete' });

interface DeleteRequestBody {
  /** Confirmation that user understands deletion is irreversible */
  confirmDeletion: boolean;
  /** Optional reason for deletion (for analytics, not required) */
  reason?: string;
}

interface DeleteResult {
  success: boolean;
  deletedData: {
    conversations: number;
    messages: number;
    flashcards: number;
    studyProgress: number;
    embeddings: number;
    preferences: number;
  };
  message: string;
}

/**
 * POST /api/privacy/delete-my-data
 *
 * Deletes all personal data for the authenticated user.
 * This is irreversible and complies with GDPR Art. 17.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<DeleteResult | { error: string }>> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized - no user session found' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as DeleteRequestBody;

    if (!body.confirmDeletion) {
      return NextResponse.json(
        { error: 'Deletion must be explicitly confirmed' },
        { status: 400 }
      );
    }

    log.info('GDPR deletion request initiated', {
      userId: userId.slice(0, 8),
      reason: body.reason || 'not provided',
    });

    // Execute deletion in transaction for atomicity
    const result = await executeUserDataDeletion(userId);

    // Log the deletion for audit (without PII)
    await logDeletionAudit(userId, body.reason);

    // Clear the user cookie
    cookieStore.delete('userId');

    log.info('GDPR deletion completed', {
      userId: userId.slice(0, 8),
      ...result.deletedData,
    });

    return NextResponse.json(result);
  } catch (error) {
    log.error('GDPR deletion failed', { error, userId: userId.slice(0, 8) });
    return NextResponse.json(
      { error: 'Failed to delete user data. Please contact support.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/privacy/delete-my-data
 *
 * Returns a summary of data that would be deleted.
 * Helps users understand what deletion will remove.
 */
export async function GET(
  _request: NextRequest
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized - no user session found' },
      { status: 401 }
    );
  }

  try {
    const summary = await getUserDataSummary(userId);
    return NextResponse.json({
      userId: userId.slice(0, 8) + '...',
      dataToBeDeleted: summary,
      warning:
        'This action is irreversible. All your learning progress, conversations, and preferences will be permanently deleted.',
    });
  } catch (error) {
    log.error('Failed to get data summary', { error });
    return NextResponse.json(
      { error: 'Failed to retrieve data summary' },
      { status: 500 }
    );
  }
}

/**
 * Execute complete user data deletion
 */
async function executeUserDataDeletion(userId: string): Promise<DeleteResult> {
  const deletedData = {
    conversations: 0,
    messages: 0,
    flashcards: 0,
    studyProgress: 0,
    embeddings: 0,
    preferences: 0,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.$transaction(async (tx: any) => {
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

    // 3. Delete flashcard reviews (child of flashcards)
    await tx.flashcardReview.deleteMany({
      where: { flashcard: { userId } },
    });

    // 4. Delete flashcards
    const fcResult = await tx.flashcard.deleteMany({
      where: { userId },
    });
    deletedData.flashcards = fcResult.count;

    // 5. Delete study progress
    const progressResult = await tx.studyProgress.deleteMany({
      where: { userId },
    });
    deletedData.studyProgress = progressResult.count;

    // 6. Delete embeddings/vectors
    const embResult = await tx.embedding.deleteMany({
      where: { userId },
    });
    deletedData.embeddings = embResult.count;

    // 7. Delete user preferences
    const prefResult = await tx.userPreferences.deleteMany({
      where: { userId },
    });
    deletedData.preferences = prefResult.count;

    // 8. Delete privacy preferences
    await tx.userPrivacyPreferences.deleteMany({
      where: { userId },
    }).catch(() => {
      // Table might not exist
    });

    // 9. Delete accessibility settings
    await tx.accessibilitySettings.deleteMany({
      where: { userId },
    }).catch(() => {
      // Table might not exist
    });

    // 10. Delete study sessions
    await tx.studySession.deleteMany({
      where: { userId },
    }).catch(() => {
      // Table might not exist
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
async function getUserDataSummary(userId: string) {
  const [
    conversations,
    messages,
    flashcards,
    studyProgress,
    embeddings,
  ] = await Promise.all([
    prisma.conversation.count({ where: { userId } }),
    prisma.message.count({ where: { conversation: { userId } } }),
    prisma.flashcard.count({ where: { userId } }),
    prisma.studyProgress.count({ where: { userId } }),
    prisma.embedding.count({ where: { userId } }).catch(() => 0),
  ]);

  return {
    conversations,
    messages,
    flashcards,
    studyProgress,
    embeddings,
    estimatedDataPoints: conversations + messages + flashcards + studyProgress,
  };
}

/**
 * Log deletion for audit trail (GDPR compliance)
 * Stores only anonymized info about the deletion event
 */
async function logDeletionAudit(
  userId: string,
  reason?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: 'GDPR_DATA_DELETION',
        entityType: 'user',
        entityId: userId.slice(0, 8) + '***', // Anonymized
        metadata: {
          reason: reason || 'user_request',
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch {
    // Audit log table might not exist, log to file instead
    log.info('GDPR deletion audit', {
      action: 'GDPR_DATA_DELETION',
      anonymizedUserId: userId.slice(0, 8),
      reason: reason || 'user_request',
    });
  }
}
