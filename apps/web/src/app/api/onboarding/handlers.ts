import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateAuth } from '@/lib/auth/server';
import { pipe, withSentry, withCSRF } from '@/lib/api/middlewares';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_CLIENT } from '@/lib/auth/server';
import { calculateAndPublishAdminCounts } from '@/lib/helpers/publish-admin-counts';
import {
  COPPA_AGE_THRESHOLD,
  requestParentalConsent,
  checkCoppaStatus,
} from '@/lib/compliance/server';
import { assignBaseTierToNewUser } from '@/lib/tier/server';
import { safeReadJson } from '@/lib/api/safe-json';

import { PostBodySchema, emptyResponse } from './types';
import { buildExistingData, buildEffectiveState } from './helpers';

export { PostBodySchema } from './types';

export const GET = pipe(withSentry('/api/onboarding'))(async () => {
  const auth = await validateAuth();
  if (!auth.authenticated) {
    return NextResponse.json(emptyResponse);
  }
  const userId = auth.userId!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      onboarding: true,
    },
  });

  if (!user) {
    return NextResponse.json(emptyResponse);
  }

  const existingData = buildExistingData(user.onboarding?.data, user.profile);

  const isCredentialedUser = Boolean(user.passwordHash);
  const hasExistingData = Boolean(existingData.name) || isCredentialedUser;

  const effectiveOnboardingState = buildEffectiveState(user.onboarding, isCredentialedUser);

  return NextResponse.json({
    hasExistingData,
    data: hasExistingData ? existingData : null,
    onboardingState: effectiveOnboardingState,
  });
});

export const POST = pipe(
  withSentry('/api/onboarding'),
  withCSRF,
)(async (ctx) => {
  const body = await safeReadJson(ctx.req);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const validation = PostBodySchema.safeParse(body);
  if (!validation.success) {
    logger.warn('Onboarding API validation failed', {
      issues: validation.error.issues,
    });
    return NextResponse.json({ error: 'Invalid onboarding data' }, { status: 400 });
  }

  const data = validation.data;
  const auth = await validateAuth();
  let userId = auth.userId;

  const { data: onboardingData, hasCompletedOnboarding, currentStep, isReplayMode } = data;

  if (!userId) {
    logger.info('Creating new user for onboarding');
    const user = await prisma.user.create({
      data: {},
    });
    userId = user.id;
    logger.info('User created', { userId });

    // Assign Base tier to new user (Plan 073: T4-07)
    await assignBaseTierToNewUser(user.id);

    // Trigger admin counts update (non-blocking)
    calculateAndPublishAdminCounts('user-signup').catch((err) =>
      logger.warn('Failed to publish admin counts on user signup', {
        error: String(err),
      }),
    );

    try {
      const { signCookieValue } = await import('@/lib/auth/server');
      const signedCookie = signCookieValue(user.id);
      const cookieStore = await cookies();
      // Server-side auth cookie (httpOnly, signed)
      cookieStore.set(AUTH_COOKIE_NAME, signedCookie.signed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });

      // Client-readable cookie (for client-side userId access)
      cookieStore.set(AUTH_COOKIE_CLIENT, user.id, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });

      logger.info('User cookies set successfully', { userId });
    } catch (cookieError) {
      logger.error('Failed to set user cookie', {
        userId,
        error: String(cookieError),
      });
      throw cookieError;
    }
  }

  logger.info('Upserting onboarding state', {
    userId,
    hasCompletedOnboarding,
  });
  const onboardingState = await prisma.onboardingState.upsert({
    where: { userId },
    create: {
      userId,
      data: onboardingData ? JSON.stringify(onboardingData) : '{}',
      hasCompletedOnboarding: hasCompletedOnboarding ?? false,
      currentStep: currentStep ?? 'welcome',
      isReplayMode: isReplayMode ?? false,
    },
    update: {
      ...(onboardingData && { data: JSON.stringify(onboardingData) }),
      ...(hasCompletedOnboarding !== undefined && { hasCompletedOnboarding }),
      ...(currentStep && { currentStep }),
      ...(isReplayMode !== undefined && { isReplayMode }),
      ...(hasCompletedOnboarding && { onboardingCompletedAt: new Date() }),
    },
  });
  logger.info('Onboarding state upserted', { userId });

  if (onboardingData?.name) {
    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        name: onboardingData.name,
        age: onboardingData.age,
        schoolLevel: onboardingData.schoolLevel ?? 'superiore',
      },
      update: {
        name: onboardingData.name,
        ...(onboardingData.age && { age: onboardingData.age }),
        ...(onboardingData.schoolLevel && {
          schoolLevel: onboardingData.schoolLevel,
        }),
      },
    });
  }

  let coppaStatus = null;
  if (onboardingData?.age && onboardingData.age < COPPA_AGE_THRESHOLD) {
    const existingStatus = await checkCoppaStatus(userId);

    if (!existingStatus.consentGranted && !existingStatus.consentPending) {
      if (!onboardingData.parentEmail) {
        return NextResponse.json(
          {
            error: 'Parent email required',
            message:
              'Per legge (COPPA), i minori di 13 anni necessitano del consenso dei genitori. ' +
              "Fornisci l'email di un genitore per la verifica.",
            requiresParentEmail: true,
            coppaRequired: true,
          },
          { status: 400 },
        );
      }

      const consentResult = await requestParentalConsent(
        userId,
        onboardingData.age,
        onboardingData.parentEmail,
        onboardingData.name,
      );

      coppaStatus = {
        consentRequired: true,
        consentPending: true,
        emailSent: consentResult.emailSent,
        expiresAt: consentResult.expiresAt.toISOString(),
      };

      logger.info('COPPA consent initiated', {
        userId,
        age: onboardingData.age,
        emailSent: consentResult.emailSent,
      });
    } else {
      coppaStatus = {
        consentRequired: true,
        consentGranted: existingStatus.consentGranted,
        consentPending: existingStatus.consentPending,
      };
    }
  }

  logger.info('Onboarding state saved', { userId, hasCompletedOnboarding });

  return NextResponse.json({
    success: true,
    onboardingState: {
      hasCompletedOnboarding: onboardingState.hasCompletedOnboarding,
      currentStep: onboardingState.currentStep,
    },
    ...(coppaStatus && { coppa: coppaStatus }),
  });
});
