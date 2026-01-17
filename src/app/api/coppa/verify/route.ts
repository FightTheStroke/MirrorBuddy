/**
 * COPPA Verification API
 *
 * POST - Verify parental consent with code
 * DELETE - Deny parental consent
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyParentalConsent,
  denyParentalConsent,
} from '@/lib/compliance/coppa-service';
import { logger } from '@/lib/logger';
import { getClientIdentifier } from '@/lib/rate-limit';
import { validateAuth } from '@/lib/auth/session-auth';

const log = logger.child({ module: 'api-coppa-verify' });

/**
 * POST /api/coppa/verify - Verify parental consent
 *
 * Body: { verificationCode: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { verificationCode } = body;

    if (!verificationCode || typeof verificationCode !== 'string') {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Normalize code (uppercase, trim)
    const normalizedCode = verificationCode.trim().toUpperCase();

    if (normalizedCode.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid verification code format' },
        { status: 400 }
      );
    }

    const ipAddress = getClientIdentifier(request);
    const result = await verifyParentalConsent(normalizedCode, ipAddress);

    if (!result.success) {
      log.warn('COPPA verification failed', {
        error: result.error,
        ipAddress,
      });
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    log.info('COPPA consent verified', { userId: result.userId });

    return NextResponse.json({
      success: true,
      message: 'Parental consent verified successfully',
    });
  } catch (error) {
    log.error('Failed to verify consent', { error: String(error) });
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/coppa/verify - Deny parental consent
 *
 * Requires authentication - the user requesting denial
 */
export async function DELETE() {
  const auth = await validateAuth();
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const result = await denyParentalConsent(auth.userId);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to deny consent' },
        { status: 500 }
      );
    }

    log.info('COPPA consent denied by parent', { userId: auth.userId });

    return NextResponse.json({
      success: true,
      message: 'Parental consent denied',
    });
  } catch (error) {
    log.error('Failed to deny consent', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to deny consent' },
      { status: 500 }
    );
  }
}
