/**
 * API Route: Profile Consent Management
 *
 * POST /api/profile/consent - Record parent/student consent
 * DELETE /api/profile/consent - Request data deletion (GDPR)
 *
 * GDPR Compliance:
 * - Right to be informed (via app UI)
 * - Right of access (GET /api/profile)
 * - Right to erasure (DELETE /api/profile/consent)
 * - Record of consent with timestamp
 *
 * Related: Issue #31 Collaborative Student Profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import {
  validateConsentInput,
  upsertConsentProfile,
  logConsentAction,
  markProfileForDeletion,
  deleteProfileImmediately,
} from './helpers';

/**
 * GET /api/profile/consent - Check consent status for a user
 */
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`consent:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const profile = await prisma.studentInsightProfile.findUnique({
      where: { userId },
      select: {
        parentConsent: true,
        studentConsent: true,
        consentDate: true,
        deletionRequested: true,
      },
    });

    if (!profile) {
      return NextResponse.json({
        success: true,
        data: {
          hasProfile: false,
          parentConsent: false,
          studentConsent: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        hasProfile: true,
        parentConsent: profile.parentConsent,
        studentConsent: profile.studentConsent,
        consentDate: profile.consentDate,
        deletionRequested: profile.deletionRequested,
      },
    });
  } catch (error) {
    logger.error('Consent check error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile/consent - Records consent for profile creation and viewing
 */
export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`consent:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    logger.warn('Rate limit exceeded', { clientId, endpoint: '/api/profile/consent' });
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();
    const validation = validateConsentInput(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'Invalid input' },
        { status: 400 }
      );
    }

    const { userId, parentConsent, studentConsent, consentGivenBy } = validation.data;
    const profile = await upsertConsentProfile(userId, parentConsent, studentConsent);

    await logConsentAction(
      profile.id,
      consentGivenBy || clientId,
      'edit',
      `Consent updated: parent=${profile.parentConsent}, student=${profile.studentConsent}`,
      clientId,
      request.headers.get('user-agent') || undefined
    );

    logger.info('Consent recorded', {
      userId,
      parentConsent: profile.parentConsent,
      studentConsent: profile.studentConsent,
    });

    return NextResponse.json({
      success: true,
      message: 'Consent recorded successfully',
      data: {
        parentConsent: profile.parentConsent,
        studentConsent: profile.studentConsent,
        consentDate: profile.consentDate,
      },
    });
  } catch (error) {
    logger.error('Consent API error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profile/consent - Request deletion of all profile data (GDPR right to erasure)
 */
export async function DELETE(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`consent:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    logger.warn('Rate limit exceeded', { clientId, endpoint: '/api/profile/consent' });
    return rateLimitResponse(rateLimit);
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const immediate = searchParams.get('immediate') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const profile = await prisma.studentInsightProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (immediate) {
      await deleteProfileImmediately(profile.id, userId);

      return NextResponse.json({
        success: true,
        message: 'Profile and all associated data have been deleted',
      });
    }

    await markProfileForDeletion(
      profile.id,
      clientId,
      clientId,
      request.headers.get('user-agent') || undefined
    );

    logger.info('Deletion requested', { userId });

    return NextResponse.json({
      success: true,
      message: 'Deletion request recorded. Data will be deleted within 30 days.',
      data: {
        deletionRequested: new Date(),
        expectedDeletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  } catch (error) {
    logger.error('Deletion request error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
