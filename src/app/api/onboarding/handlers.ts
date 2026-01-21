import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma, isDatabaseNotInitialized } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { CookieSigningError } from "@/lib/auth/cookie-signing";
import { calculateAndPublishAdminCounts } from "@/lib/helpers/publish-admin-counts";
import {
  COPPA_AGE_THRESHOLD,
  requestParentalConsent,
  checkCoppaStatus,
} from "@/lib/compliance/coppa-service";

import { PostBodySchema, emptyResponse } from "./types";
import { buildExistingData, buildEffectiveState } from "./helpers";

export { PostBodySchema } from "./types";

export async function GET() {
  try {
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

    const effectiveOnboardingState = buildEffectiveState(
      user.onboarding,
      isCredentialedUser,
    );

    return NextResponse.json({
      hasExistingData,
      data: hasExistingData ? existingData : null,
      onboardingState: effectiveOnboardingState,
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

export async function POST(
  request: NextRequest,
  data: z.infer<typeof PostBodySchema>,
) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAuth();
    let userId = auth.userId;

    const {
      data: onboardingData,
      hasCompletedOnboarding,
      currentStep,
      isReplayMode,
    } = data;

    if (!userId) {
      logger.info("Creating new user for onboarding");
      const user = await prisma.user.create({
        data: {},
      });
      userId = user.id;
      logger.info("User created", { userId });

      // Trigger admin counts update (non-blocking)
      calculateAndPublishAdminCounts("user-signup").catch((err) =>
        logger.warn("Failed to publish admin counts on user signup", {
          error: String(err),
        }),
      );

      try {
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
        logger.info("User cookie set successfully", { userId });
      } catch (cookieError) {
        logger.error("Failed to set user cookie", {
          userId,
          error: String(cookieError),
        });
        throw cookieError;
      }
    }

    logger.info("Upserting onboarding state", {
      userId,
      hasCompletedOnboarding,
    });
    const onboardingState = await prisma.onboardingState.upsert({
      where: { userId },
      create: {
        userId,
        data: onboardingData ? JSON.stringify(onboardingData) : "{}",
        hasCompletedOnboarding: hasCompletedOnboarding ?? false,
        currentStep: currentStep ?? "welcome",
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
    logger.info("Onboarding state upserted", { userId });

    if (onboardingData?.name) {
      await prisma.profile.upsert({
        where: { userId },
        create: {
          userId,
          name: onboardingData.name,
          age: onboardingData.age,
          schoolLevel: onboardingData.schoolLevel ?? "superiore",
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

        logger.info("COPPA consent initiated", {
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

    if (error instanceof CookieSigningError) {
      logger.error("Session secret configuration error", {
        code: error.code,
        message: error.message,
      });
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to save onboarding state" },
      { status: 500 },
    );
  }
}
