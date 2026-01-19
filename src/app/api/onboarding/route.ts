/**
 * API Route: Onboarding State
 *
 * GET: Fetch existing onboarding state and profile data
 * POST: Save onboarding state and sync to profile
 *
 * Issue #73: Load existing user data for returning users
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/session-auth";
import { z } from "zod";
import { prisma, isDatabaseNotInitialized } from "@/lib/db";
import { logger } from "@/lib/logger";
import { cookies } from "next/headers";
import { requireCSRF } from "@/lib/security/csrf";
import {
  COPPA_AGE_THRESHOLD,
  requestParentalConsent,
  checkCoppaStatus,
} from "@/lib/compliance/coppa-service";

// Zod schema for input validation
const OnboardingDataSchema = z.object({
  name: z.string().min(2).max(50),
  age: z.number().int().min(6).max(19).optional(),
  schoolLevel: z.enum(["elementare", "media", "superiore"]).optional(),
  learningDifferences: z.array(z.string()).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  // COPPA: Required for children under 13
  parentEmail: z.string().email().optional(),
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
  schoolLevel?: "elementare" | "media" | "superiore";
  learningDifferences?: string[];
  gender?: "male" | "female" | "other";
  parentEmail?: string;
}

/**
 * GET /api/onboarding
 * Returns existing onboarding state and profile data for the current user.
 */
export async function GET() {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({
        hasExistingData: false,
        data: null,
        onboardingState: null,
      });
    }
    const userId = auth.userId!;

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
      name: "",
    };

    // Priority: onboarding data > profile data
    if (user.onboarding?.data) {
      try {
        const onboardingData = JSON.parse(
          user.onboarding.data,
        ) as OnboardingData;
        if (onboardingData.name) existingData.name = onboardingData.name;
        if (onboardingData.age) existingData.age = onboardingData.age;
        if (onboardingData.schoolLevel)
          existingData.schoolLevel = onboardingData.schoolLevel;
        if (onboardingData.learningDifferences)
          existingData.learningDifferences = onboardingData.learningDifferences;
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
      existingData.schoolLevel = user.profile.schoolLevel as
        | "elementare"
        | "media"
        | "superiore";
    }

    const hasExistingData = Boolean(existingData.name);

    return NextResponse.json({
      hasExistingData,
      data: hasExistingData ? existingData : null,
      onboardingState: user.onboarding
        ? {
            hasCompletedOnboarding: user.onboarding.hasCompletedOnboarding,
            onboardingCompletedAt: user.onboarding.onboardingCompletedAt,
            currentStep: user.onboarding.currentStep,
            isReplayMode: user.onboarding.isReplayMode,
          }
        : null,
    });
  } catch (error) {
    logger.error("Onboarding API GET error", { error: String(error) });

    if (isDatabaseNotInitialized(error)) {
      return NextResponse.json(
        { error: "Database not initialized" },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to get onboarding state" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/onboarding
 * Saves onboarding state and syncs data to user profile.
 */
export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAuth();
    let userId = auth.userId;

    const body = await request.json();

    // Validate input with Zod
    const parseResult = PostBodySchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn("Onboarding API validation failed", {
        issues: parseResult.error.issues,
      });
      return NextResponse.json(
        { error: "Invalid request data", details: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { data, hasCompletedOnboarding, currentStep, isReplayMode } =
      parseResult.data;

    // Create user if doesn't exist
    if (!userId) {
      const user = await prisma.user.create({
        data: {},
      });
      userId = user.id;

      // Set cookie for new user
      const { signCookieValue } = await import("@/lib/auth/cookie-signing");
      const signedCookie = signCookieValue(user.id);
      const cookieStore = await cookies();
      cookieStore.set("mirrorbuddy-user-id", signedCookie.signed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }

    // Upsert onboarding state
    const onboardingState = await prisma.onboardingState.upsert({
      where: { userId },
      create: {
        userId,
        data: data ? JSON.stringify(data) : "{}",
        hasCompletedOnboarding: hasCompletedOnboarding ?? false,
        currentStep: currentStep ?? "welcome",
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
          schoolLevel: data.schoolLevel ?? "superiore",
        },
        update: {
          name: data.name,
          ...(data.age && { age: data.age }),
          ...(data.schoolLevel && { schoolLevel: data.schoolLevel }),
        },
      });
    }

    // COPPA Compliance: Trigger parental consent for children under 13
    let coppaStatus = null;
    if (data?.age && data.age < COPPA_AGE_THRESHOLD) {
      // Check if consent already granted
      const existingStatus = await checkCoppaStatus(userId);

      if (!existingStatus.consentGranted && !existingStatus.consentPending) {
        // Require parent email for children under 13
        if (!data.parentEmail) {
          return NextResponse.json(
            {
              error: "Parent email required",
              message:
                "Per legge (COPPA), i minori di 13 anni necessitano del consenso dei genitori. " +
                "Fornisci l'email di un genitore per la verifica.",
              requiresParentEmail: true,
              coppaRequired: true,
            },
            { status: 400 },
          );
        }

        // Initiate COPPA consent flow
        const consentResult = await requestParentalConsent(
          userId,
          data.age,
          data.parentEmail,
          data.name,
        );

        coppaStatus = {
          consentRequired: true,
          consentPending: true,
          emailSent: consentResult.emailSent,
          expiresAt: consentResult.expiresAt.toISOString(),
        };

        logger.info("COPPA consent initiated", {
          userId,
          age: data.age,
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

    logger.info("Onboarding state saved", { userId, hasCompletedOnboarding });

    return NextResponse.json({
      success: true,
      onboardingState: {
        hasCompletedOnboarding: onboardingState.hasCompletedOnboarding,
        currentStep: onboardingState.currentStep,
      },
      ...(coppaStatus && { coppa: coppaStatus }),
    });
  } catch (error) {
    logger.error("Onboarding API POST error", { error: String(error) });

    if (isDatabaseNotInitialized(error)) {
      return NextResponse.json(
        { error: "Database not initialized" },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to save onboarding state" },
      { status: 500 },
    );
  }
}
