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
<<<<<<< HEAD
import {
  validateConsentInput,
  upsertConsentProfile,
  logConsentAction,
  markProfileForDeletion,
  deleteProfileImmediately,
} from './helpers';
||||||| parent of 2a70a69 (auto-claude: subtask-4-1 - Create and apply validation schemas for /api/profile/* routes)
=======
import { validateRequest, formatValidationErrors } from '@/lib/validation/middleware';
import { ProfileConsentSchema, ProfileDeleteQuerySchema, ProfileQuerySchema } from '@/lib/validation/schemas/profile';
>>>>>>> 2a70a69 (auto-claude: subtask-4-1 - Create and apply validation schemas for /api/profile/* routes)

/**
<<<<<<< HEAD
 * GET /api/profile/consent - Check consent status for a user
||||||| parent of 2a70a69 (auto-claude: subtask-4-1 - Create and apply validation schemas for /api/profile/* routes)
 * POST /api/profile/consent
 * Records consent for profile creation and viewing
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
    const { userId, parentConsent, studentConsent, consentGivenBy } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (parentConsent === undefined && studentConsent === undefined) {
      return NextResponse.json(
        { error: 'At least one consent type (parentConsent or studentConsent) is required' },
        { status: 400 }
      );
    }

    // Get or create profile
    let profile = await prisma.studentInsightProfile.findUnique({
      where: { userId },
    });

    const userProfile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Create a minimal profile to record consent
      profile = await prisma.studentInsightProfile.create({
        data: {
          userId,
          studentName: userProfile?.name || 'Studente',
          parentConsent: parentConsent ?? false,
          studentConsent: studentConsent ?? false,
          consentDate: new Date(),
        },
      });
    } else {
      // Update existing profile with consent
      profile = await prisma.studentInsightProfile.update({
        where: { userId },
        data: {
          parentConsent: parentConsent ?? profile.parentConsent,
          studentConsent: studentConsent ?? profile.studentConsent,
          consentDate: new Date(),
        },
      });
    }

    // Log the consent action
    await prisma.profileAccessLog.create({
      data: {
        profileId: profile.id,
        userId: consentGivenBy || clientId,
        action: 'edit',
        details: `Consent updated: parent=${profile.parentConsent}, student=${profile.studentConsent}`,
        ipAddress: clientId,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

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
 * DELETE /api/profile/consent
 * Request deletion of all profile data (GDPR right to erasure)
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
      // Immediate deletion (for testing or urgent requests)
      await prisma.profileAccessLog.deleteMany({
        where: { profileId: profile.id },
      });
      await prisma.studentInsightProfile.delete({
        where: { userId },
      });

      logger.info('Profile deleted immediately', { userId });

      return NextResponse.json({
        success: true,
        message: 'Profile and all associated data have been deleted',
      });
    } else {
      // Standard GDPR flow: mark for deletion, delete in 30 days
      await prisma.studentInsightProfile.update({
        where: { userId },
        data: {
          deletionRequested: new Date(),
          parentConsent: false,
          studentConsent: false,
        },
      });

      // Log the deletion request
      await prisma.profileAccessLog.create({
        data: {
          profileId: profile.id,
          userId: clientId,
          action: 'delete_request',
          details: 'Deletion requested, will be processed within 30 days',
          ipAddress: clientId,
          userAgent: request.headers.get('user-agent') || undefined,
        },
      });

      logger.info('Deletion requested', { userId });

      return NextResponse.json({
        success: true,
        message: 'Deletion request recorded. Data will be deleted within 30 days.',
        data: {
          deletionRequested: new Date(),
          expectedDeletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  } catch (error) {
    logger.error('Deletion request error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profile/consent
 * Check consent status for a user
=======
 * POST /api/profile/consent
 * Records consent for profile creation and viewing
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

    const validation = validateRequest(ProfileConsentSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatValidationErrors(validation.error) },
        { status: 400 }
      );
    }

    const { userId, parentConsent, studentConsent, consentGivenBy } = validation.data;

    if (parentConsent === undefined && studentConsent === undefined) {
      return NextResponse.json(
        { error: 'At least one consent type (parentConsent or studentConsent) is required' },
        { status: 400 }
      );
    }

    // Get or create profile
    let profile = await prisma.studentInsightProfile.findUnique({
      where: { userId },
    });

    const userProfile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Create a minimal profile to record consent
      profile = await prisma.studentInsightProfile.create({
        data: {
          userId,
          studentName: userProfile?.name || 'Studente',
          parentConsent: parentConsent ?? false,
          studentConsent: studentConsent ?? false,
          consentDate: new Date(),
        },
      });
    } else {
      // Update existing profile with consent
      profile = await prisma.studentInsightProfile.update({
        where: { userId },
        data: {
          parentConsent: parentConsent ?? profile.parentConsent,
          studentConsent: studentConsent ?? profile.studentConsent,
          consentDate: new Date(),
        },
      });
    }

    // Log the consent action
    await prisma.profileAccessLog.create({
      data: {
        profileId: profile.id,
        userId: consentGivenBy || clientId,
        action: 'edit',
        details: `Consent updated: parent=${profile.parentConsent}, student=${profile.studentConsent}`,
        ipAddress: clientId,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

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
 * DELETE /api/profile/consent
 * Request deletion of all profile data (GDPR right to erasure)
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
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = validateRequest(ProfileDeleteQuerySchema, queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatValidationErrors(validation.error) },
        { status: 400 }
      );
    }

    const { userId, immediate: immediateParam } = validation.data;
    const immediate = immediateParam === 'true';

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
      // Immediate deletion (for testing or urgent requests)
      await prisma.profileAccessLog.deleteMany({
        where: { profileId: profile.id },
      });
      await prisma.studentInsightProfile.delete({
        where: { userId },
      });

      logger.info('Profile deleted immediately', { userId });

      return NextResponse.json({
        success: true,
        message: 'Profile and all associated data have been deleted',
      });
    } else {
      // Standard GDPR flow: mark for deletion, delete in 30 days
      await prisma.studentInsightProfile.update({
        where: { userId },
        data: {
          deletionRequested: new Date(),
          parentConsent: false,
          studentConsent: false,
        },
      });

      // Log the deletion request
      await prisma.profileAccessLog.create({
        data: {
          profileId: profile.id,
          userId: clientId,
          action: 'delete_request',
          details: 'Deletion requested, will be processed within 30 days',
          ipAddress: clientId,
          userAgent: request.headers.get('user-agent') || undefined,
        },
      });

      logger.info('Deletion requested', { userId });

      return NextResponse.json({
        success: true,
        message: 'Deletion request recorded. Data will be deleted within 30 days.',
        data: {
          deletionRequested: new Date(),
          expectedDeletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  } catch (error) {
    logger.error('Deletion request error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profile/consent
 * Check consent status for a user
>>>>>>> 2a70a69 (auto-claude: subtask-4-1 - Create and apply validation schemas for /api/profile/* routes)
 */
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`consent:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = validateRequest(ProfileQuerySchema, queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatValidationErrors(validation.error) },
        { status: 400 }
      );
    }

    const { userId } = validation.data;

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
