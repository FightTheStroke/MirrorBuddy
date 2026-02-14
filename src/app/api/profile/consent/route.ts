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

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  rateLimitResponse,
} from '@/lib/rate-limit';
import { validateRequest, formatValidationErrors } from '@/lib/validation/middleware';
import {
  ProfileConsentSchema,
  ProfileDeleteQuerySchema,
  ProfileQuerySchema,
} from '@/lib/validation/schemas/profile';
import { pipe, withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';
import {
  upsertConsentProfile,
  logConsentAction,
  markProfileForDeletion,
  deleteProfileImmediately,
} from './helpers';

/**
 * GET /api/profile/consent - Check consent status for a user
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/profile/consent'),
  withAuth,
)(async (ctx) => {
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(`consent:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  const { searchParams } = new URL(ctx.req.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const validation = validateRequest(ProfileQuerySchema, queryParams);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: formatValidationErrors(validation.error),
      },
      { status: 400 },
    );
  }

  const { userId: queryUserId } = validation.data;
  const userId = ctx.userId!;
  if (queryUserId !== userId) {
    return NextResponse.json({ error: 'Cannot read consent for another user' }, { status: 403 });
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
});

/**
 * POST /api/profile/consent - Records consent for profile creation and viewing
 */
export const POST = pipe(
  withSentry('/api/profile/consent'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(`consent:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    logger.warn('Rate limit exceeded', {
      clientId,
      endpoint: '/api/profile/consent',
    });
    return rateLimitResponse(rateLimit);
  }

  const body = await ctx.req.json();

  const validation = validateRequest(ProfileConsentSchema, body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: formatValidationErrors(validation.error),
      },
      { status: 400 },
    );
  }

  const { userId: bodyUserId, parentConsent, studentConsent, consentGivenBy } = validation.data;
  const userId = ctx.userId!;
  if (bodyUserId !== userId) {
    return NextResponse.json({ error: 'Cannot update consent for another user' }, { status: 403 });
  }

  if (parentConsent === undefined && studentConsent === undefined) {
    return NextResponse.json(
      {
        error: 'At least one consent type (parentConsent or studentConsent) is required',
      },
      { status: 400 },
    );
  }

  const profile = await upsertConsentProfile(userId, parentConsent, studentConsent);

  await logConsentAction(
    profile.id,
    consentGivenBy || clientId,
    'edit',
    `Consent updated: parent=${profile.parentConsent}, student=${profile.studentConsent}`,
    clientId,
    ctx.req.headers.get('user-agent') || undefined,
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
});

/**
 * DELETE /api/profile/consent - Request deletion of all profile data (GDPR right to erasure)
 */
export const DELETE = pipe(
  withSentry('/api/profile/consent'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(`consent:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    logger.warn('Rate limit exceeded', {
      clientId,
      endpoint: '/api/profile/consent',
    });
    return rateLimitResponse(rateLimit);
  }

  const { searchParams } = new URL(ctx.req.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const validation = validateRequest(ProfileDeleteQuerySchema, queryParams);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: formatValidationErrors(validation.error),
      },
      { status: 400 },
    );
  }

  const { userId: queryUserId, immediate: immediateParam } = validation.data;
  const userId = ctx.userId!;
  if (queryUserId !== userId) {
    return NextResponse.json({ error: 'Cannot delete consent for another user' }, { status: 403 });
  }
  const immediate = immediateParam === 'true';

  const profile = await prisma.studentInsightProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
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
    ctx.req.headers.get('user-agent') || undefined,
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
});
