/**
 * GDPR Delete My Data API
 * Part of Ethical Design Hardening (F-03)
 *
 * Implements GDPR Article 17 - Right to Erasure
 * Allows users to request complete deletion of their personal data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestLogger, getRequestId } from '@/lib/tracing';
import { cookies } from 'next/headers';
import { isSignedCookie, verifyCookieValue } from '@/lib/auth/cookie-signing';
import {
  executeUserDataDeletion,
  getUserDataSummary,
  logDeletionAudit,
} from './helpers';



/**
 * Extract userId from signed cookie
 * Only accepts signed cookies with httpOnly/secure flags
 */
function extractUserId(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;

  if (isSignedCookie(cookieValue)) {
    const verification = verifyCookieValue(cookieValue);
    return verification.valid ? verification.value! : null;
  }

  return null;
}

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
  const log = getRequestLogger(request);
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get('mirrorbuddy-user-id')?.value;
  const userId = extractUserId(cookieValue);

  if (!userId) {
    const response = NextResponse.json(
      { error: 'Unauthorized - no user session found' },
      { status: 401 }
    );
    response.headers.set('X-Request-ID', getRequestId(request));
    return response;
  }

  try {
    const body = (await request.json()) as DeleteRequestBody;

    if (!body.confirmDeletion) {
      const response = NextResponse.json(
        { error: 'Deletion must be explicitly confirmed' },
        { status: 400 }
      );
      response.headers.set('X-Request-ID', getRequestId(request));
      return response;
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
    cookieStore.delete('mirrorbuddy-user-id');

    log.info('GDPR deletion completed', {
      userId: userId.slice(0, 8),
      ...result.deletedData,
    });

    const response = NextResponse.json(result);
    response.headers.set('X-Request-ID', getRequestId(request));
    return response;
  } catch (error) {
    log.error('GDPR deletion failed', { error, userId: userId.slice(0, 8) });
    const response = NextResponse.json(
      { error: 'Failed to delete user data. Please contact support.' },
      { status: 500 }
    );
    response.headers.set('X-Request-ID', getRequestId(request));
    return response;
  }
}

/**
 * GET /api/privacy/delete-my-data
 *
 * Returns a summary of data that would be deleted.
 * Helps users understand what deletion will remove.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  const log = getRequestLogger(request);
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get('mirrorbuddy-user-id')?.value;
  const userId = extractUserId(cookieValue);

  if (!userId) {
    const response = NextResponse.json(
      { error: 'Unauthorized - no user session found' },
      { status: 401 }
    );
    response.headers.set('X-Request-ID', getRequestId(request));
    return response;
  }

  try {
    const summary = await getUserDataSummary(userId);
    const response = NextResponse.json({
      userId: userId.slice(0, 8) + '...',
      dataToBeDeleted: summary,
      warning:
        'This action is irreversible. All your learning progress, conversations, and preferences will be permanently deleted.',
    });
    response.headers.set('X-Request-ID', getRequestId(request));
    return response;
  } catch (error) {
    log.error('Failed to get data summary', { error });
    const response = NextResponse.json(
      { error: 'Failed to retrieve data summary' },
      { status: 500 }
    );
    response.headers.set('X-Request-ID', getRequestId(request));
    return response;
  }
}

