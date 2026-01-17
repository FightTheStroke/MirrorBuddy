/**
 * COPPA Compliance API
 *
 * Handles parental consent for users under 13.
 *
 * GET  - Check COPPA status for authenticated user
 * POST - Request parental consent (sends verification email)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth/session-auth';
import {
  checkCoppaStatus,
  requestParentalConsent,
  COPPA_AGE_THRESHOLD,
} from '@/lib/compliance/coppa-service';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'api-coppa' });

/**
 * GET /api/coppa - Check COPPA status
 */
export async function GET() {
  const auth = await validateAuth();
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const status = await checkCoppaStatus(auth.userId);
    return NextResponse.json({
      ...status,
      ageThreshold: COPPA_AGE_THRESHOLD,
    });
  } catch (error) {
    log.error('Failed to get COPPA status', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to check COPPA status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/coppa - Request parental consent
 *
 * Body: { parentEmail: string, age: number }
 */
export async function POST(request: NextRequest) {
  const auth = await validateAuth();
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { parentEmail, age } = body;

    if (!parentEmail || typeof parentEmail !== 'string') {
      return NextResponse.json(
        { error: 'Parent email is required' },
        { status: 400 }
      );
    }

    if (typeof age !== 'number' || age < 1 || age > 120) {
      return NextResponse.json({ error: 'Valid age is required' }, { status: 400 });
    }

    // Only request consent for under-13
    if (age >= COPPA_AGE_THRESHOLD) {
      return NextResponse.json(
        { error: 'Parental consent not required for age 13+' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parentEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const result = await requestParentalConsent(auth.userId, age, parentEmail);

    log.info('Parental consent requested', {
      userId: auth.userId,
      age,
      expiresAt: result.expiresAt.toISOString(),
    });

    // Note: In production, you would send an email with the verification code
    // For now, we return success and the code can be viewed in logs/DB for testing
    return NextResponse.json({
      success: true,
      message: 'Verification email sent to parent',
      expiresAt: result.expiresAt.toISOString(),
      // In development/testing, include the code
      ...(process.env.NODE_ENV !== 'production' && {
        verificationCode: result.verificationCode,
      }),
    });
  } catch (error) {
    log.error('Failed to request parental consent', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to request parental consent' },
      { status: 500 }
    );
  }
}
