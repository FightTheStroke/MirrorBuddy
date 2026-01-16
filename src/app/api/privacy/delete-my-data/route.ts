/**
 * GDPR Delete My Data API
 * Part of Ethical Design Hardening (F-03)
 *
 * Implements GDPR Article 17 - Right to Erasure
 * Allows users to request complete deletion of their personal data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { cookies } from 'next/headers';
import {
  executeUserDataDeletion,
  getUserDataSummary,
  logDeletionAudit,
} from './helpers';

const log = logger.child({ module: 'gdpr-delete' });

interface DeleteRequestBody {
  /** Confirmation that user understands deletion is irreversible */
  confirmDeletion: boolean;
  /** Optional reason for deletion (for analytics, not required) */
  reason?: string;
}

/**
 * POST /api/privacy/delete-my-data
 *
 * Deletes all personal data for the authenticated user.
 * This is irreversible and complies with GDPR Art. 17.
 */
interface DeleteResult {
  success: boolean;
  deletedData: {
    conversations: number;
    messages: number;
    materials: number;
    progress: number;
    settings: number;
  };
  message: string;
}

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
    logDeletionAudit(userId, body.reason);

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

