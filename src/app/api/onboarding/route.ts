/**
 * API Route: Onboarding State
 *
 * GET: Fetch existing onboarding state and profile data
 * POST: Save onboarding state and sync to profile
 *
 * Issue #73: Load existing user data for returning users
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma, isDatabaseNotInitialized } from '@/lib/db';
import { logger } from '@/lib/logger';

// Zod schema for input validation
const OnboardingDataSchema = z.object({
  name: z.string().min(2).max(50),
  age: z.number().int().min(6).max(19).optional(),
  schoolLevel: z.enum(['elementare', 'media', 'superiore']).optional(),
  learningDifferences: z.array(z.string()).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
});

const PostBodySchema = z.object({
  data: OnboardingDataSchema.optional(),
  hasCompletedOnboarding: z.boolean().optional(),
  currentStep: z.string().optional(),
  isReplayMode: z.boolean().optional(),
});

interface OnboardingData {
  name: string;
  age?: number;
  schoolLevel?: 'elementare' | 'media' | 'superiore';
  learningDifferences?: string[];
  gender?: 'male' | 'female' | 'other';
}

/**
 * GET /api/onboarding
 * Returns existing onboarding state and profile data for the current user.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      return NextResponse.json({
        hasExistingData: false,
        data: null,
        onboardingState: null,
      });
    }

    // Fetch user with profile and onboarding state
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        onboarding: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        hasExistingData: false,
        data: null,
        onboardingState: null,
      });
    }

    // Build existing data from profile and onboarding state
    const existingData: OnboardingData = {
      name: '',
    };

    // Priority: onboarding data > profile data
    if (user.onboarding?.data) {
      try {
        const onboardingData = JSON.parse(user.onboarding.data) as OnboardingData;
        if (onboardingData.name) existingData.name = onboardingData.name;
        if (onboardingData.age) existingData.age = onboardingData.age;
        if (onboardingData.schoolLevel) existingData.schoolLevel = onboardingData.schoolLevel;
        if (onboardingData.learningDifferences) existingData.learningDifferences = onboardingData.learningDifferences;
        if (onboardingData.gender) existingData.gender = onboardingData.gender;
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Fallback to profile data
    if (!existingData.name && user.profile?.name) {
      existingData.name = user.profile.name;
    }
    if (!existingData.age && user.profile?.age) {
      existingData.age = user.profile.age;
    }
    if (!existingData.schoolLevel && user.profile?.schoolLevel) {
      existingData.schoolLevel = user.profile.schoolLevel as 'elementare' | 'media' | 'superiore';
    }

    const hasExistingData = Boolean(existingData.name);

    return NextResponse.json({
      hasExistingData,
      data: hasExistingData ? existingData : null,
      onboardingState: user.onboarding ? {
        hasCompletedOnboarding: user.onboarding.hasCompletedOnboarding,
        onboardingCompletedAt: user.onboarding.onboardingCompletedAt,
        currentStep: user.onboarding.currentStep,
        isReplayMode: user.onboarding.isReplayMode,
      } : null,
    });
  } catch (error) {
    logger.error('Onboarding API GET error', { error: String(error) });

    if (isDatabaseNotInitialized(error)) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get onboarding state' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/onboarding
 * Saves onboarding state and syncs data to user profile.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    let userId = cookieStore.get('convergio-user-id')?.value;

    const body = await request.json();

    // Validate input with Zod
    const parseResult = PostBodySchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn('Onboarding API validation failed', { issues: parseResult.error.issues });
      return NextResponse.json(
        { error: 'Invalid request data', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const {
      data,
      hasCompletedOnboarding,
      currentStep,
      isReplayMode,
    } = parseResult.data;

    // Create user if doesn't exist
    if (!userId) {
      const user = await prisma.user.create({
        data: {},
      });
      userId = user.id;

      cookieStore.set('convergio-user-id', userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
    }

    // Upsert onboarding state
    const onboardingState = await prisma.onboardingState.upsert({
      where: { userId },
      create: {
        userId,
        data: data ? JSON.stringify(data) : '{}',
        hasCompletedOnboarding: hasCompletedOnboarding ?? false,
        currentStep: currentStep ?? 'welcome',
        isReplayMode: isReplayMode ?? false,
      },
      update: {
        ...(data && { data: JSON.stringify(data) }),
        ...(hasCompletedOnboarding !== undefined && { hasCompletedOnboarding }),
        ...(currentStep && { currentStep }),
        ...(isReplayMode !== undefined && { isReplayMode }),
        ...(hasCompletedOnboarding && { onboardingCompletedAt: new Date() }),
      },
    });

    // Sync to profile if we have name
    if (data?.name) {
      await prisma.profile.upsert({
        where: { userId },
        create: {
          userId,
          name: data.name,
          age: data.age,
          schoolLevel: data.schoolLevel ?? 'superiore',
        },
        update: {
          name: data.name,
          ...(data.age && { age: data.age }),
          ...(data.schoolLevel && { schoolLevel: data.schoolLevel }),
        },
      });
    }

    logger.info('Onboarding state saved', { userId, hasCompletedOnboarding });

    return NextResponse.json({
      success: true,
      onboardingState: {
        hasCompletedOnboarding: onboardingState.hasCompletedOnboarding,
        currentStep: onboardingState.currentStep,
      },
    });
  } catch (error) {
    logger.error('Onboarding API POST error', { error: String(error) });

    if (isDatabaseNotInitialized(error)) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save onboarding state' },
      { status: 500 }
    );
  }
}
