/**
 * API Route: Student Profile
 *
 * GET /api/profile - Get student profile with insights
 * POST /api/profile - Create/update student profile
 *
 * Related: Issue #31 Collaborative Student Profile
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  validateRequest,
  formatValidationErrors,
} from "@/lib/validation/middleware";
import { ProfileCreateUpdateSchema } from "@/lib/validation/schemas/profile";
import { requireCSRF } from "@/lib/security/csrf";
import type {
  StudentInsights,
  MaestroObservation,
  LearningStrategy,
  LearningStyleProfile,
} from "@/types";

/**
 * GET /api/profile
 * Returns the student's insight profile for the parent dashboard
 */
export async function GET(request: NextRequest) {
  const auth = await validateAuth();
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(
    `profile:${auth.userId}`,
    RATE_LIMITS.GENERAL,
  );

  if (!rateLimit.success) {
    logger.warn("Rate limit exceeded", {
      userId: auth.userId,
      endpoint: "/api/profile",
    });
    return rateLimitResponse(rateLimit);
  }

  try {
    const userId = auth.userId;

    // Fetch profile from database
    const profile = await prisma.studentInsightProfile.findUnique({
      where: { userId },
      include: {
        accessLogs: {
          orderBy: { timestamp: "desc" },
          take: 10,
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        {
          error: "Profile not found",
          message: "No insights profile exists for this user yet",
        },
        { status: 404 },
      );
    }

    // Check consent before returning data
    if (!profile.parentConsent) {
      return NextResponse.json(
        {
          error: "Consent required",
          message: "Parent consent is required to view this profile",
          requiresConsent: true,
        },
        { status: 403 },
      );
    }

    // Parse JSON fields
    const insights: StudentInsights = {
      studentId: profile.userId,
      studentName: profile.studentName,
      lastUpdated: profile.updatedAt,
      strengths: JSON.parse(profile.strengths) as MaestroObservation[],
      growthAreas: JSON.parse(profile.growthAreas) as MaestroObservation[],
      strategies: JSON.parse(profile.strategies) as LearningStrategy[],
      learningStyle: JSON.parse(profile.learningStyle) as LearningStyleProfile,
      totalSessions: profile.sessionCount,
      totalMinutes: 0, // Would need to calculate from sessions
      maestriInteracted: [],
    };

    // Log access for GDPR audit
    await prisma.profileAccessLog.create({
      data: {
        profileId: profile.id,
        userId: auth.userId,
        action: "view",
        ipAddress: auth.userId,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: insights,
      meta: {
        confidenceScore: profile.confidenceScore,
        lastUpdated: profile.updatedAt,
        sessionCount: profile.sessionCount,
      },
    });
  } catch (error) {
    logger.error("Profile API error", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/profile
 * Creates or updates a student insight profile
 */
export async function POST(request: NextRequest) {
  // Validate CSRF token
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const auth = await validateAuth();
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(
    `profile:${auth.userId}`,
    RATE_LIMITS.GENERAL,
  );

  if (!rateLimit.success) {
    logger.warn("Rate limit exceeded", {
      userId: auth.userId,
      endpoint: "/api/profile",
    });
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();

    const validation = validateRequest(ProfileCreateUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: formatValidationErrors(validation.error),
        },
        { status: 400 },
      );
    }

    const { userId, studentName, insights } = validation.data;

    // Verify the user is updating their own profile
    if (userId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Upsert the profile
    const profile = await prisma.studentInsightProfile.upsert({
      where: { userId },
      create: {
        userId,
        studentName,
        insights: JSON.stringify(insights?.raw || []),
        strengths: JSON.stringify(insights?.strengths || []),
        growthAreas: JSON.stringify(insights?.growthAreas || []),
        strategies: JSON.stringify(insights?.strategies || []),
        learningStyle: JSON.stringify(insights?.learningStyle || {}),
        confidenceScore: insights?.confidenceScore || 0,
        sessionCount: insights?.sessionCount || 0,
      },
      update: {
        studentName,
        insights: JSON.stringify(insights?.raw || []),
        strengths: JSON.stringify(insights?.strengths || []),
        growthAreas: JSON.stringify(insights?.growthAreas || []),
        strategies: JSON.stringify(insights?.strategies || []),
        learningStyle: JSON.stringify(insights?.learningStyle || {}),
        confidenceScore: insights?.confidenceScore || 0,
        sessionCount: insights?.sessionCount || 0,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: profile.id,
        userId: profile.userId,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Profile create/update error", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
