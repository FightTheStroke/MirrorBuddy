/**
 * API Route: Profile Export
 * GET /api/profile/export - Export profile as JSON or trigger PDF generation
 * GDPR: Right of access - data portability
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";
import type {
  MaestroObservation,
  LearningStrategy,
  LearningStyleProfile,
} from "@/types";
import { generateProfileHTML } from "./helpers";

// Rate limit for exports (prevent abuse)
const EXPORT_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 10 per minute
};

/**
 * GET /api/profile/export
 * Export the student profile in JSON or PDF format
 */
export const GET = pipe(
  withSentry("/api/profile/export"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(`export:${clientId}`, EXPORT_RATE_LIMIT);

  if (!rateLimit.success) {
    logger.warn("Rate limit exceeded", {
      clientId,
      endpoint: "/api/profile/export",
    });
    return rateLimitResponse(rateLimit);
  }

  const { searchParams } = new URL(ctx.req.url);
  const format = searchParams.get("format") || "json";

  const profile = await prisma.studentInsightProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      studentName: true,
      createdAt: true,
      updatedAt: true,
      strengths: true,
      growthAreas: true,
      strategies: true,
      learningStyle: true,
      sessionCount: true,
      confidenceScore: true,
      parentConsent: true,
      studentConsent: true,
      consentDate: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!profile.parentConsent) {
    return NextResponse.json(
      { error: "Consent required to export profile" },
      { status: 403 },
    );
  }

  await prisma.profileAccessLog.create({
    data: {
      profileId: profile.id,
      userId: clientId,
      action: "download",
      details: `Exported as ${format.toUpperCase()}`,
      ipAddress: clientId,
      userAgent: ctx.req.headers.get("user-agent") || undefined,
    },
  });

  const parsedProfile = {
    studentId: profile.userId,
    studentName: profile.studentName,
    createdAt: profile.createdAt,
    lastUpdated: profile.updatedAt,
    consent: {
      parentConsent: profile.parentConsent,
      studentConsent: profile.studentConsent,
      consentDate: profile.consentDate,
    },
    insights: {
      strengths: JSON.parse(profile.strengths) as MaestroObservation[],
      growthAreas: JSON.parse(profile.growthAreas) as MaestroObservation[],
      strategies: JSON.parse(profile.strategies) as LearningStrategy[],
      learningStyle: JSON.parse(profile.learningStyle) as LearningStyleProfile,
    },
    statistics: {
      sessionCount: profile.sessionCount,
      confidenceScore: profile.confidenceScore,
    },
    accessHistory: [],
  };

  if (format === "pdf") {
    const html = generateProfileHTML(parsedProfile);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="profilo-${profile.studentName}-${new Date().toISOString().split("T")[0]}.html"`,
      },
    });
  }

  return NextResponse.json(
    {
      success: true,
      exportDate: new Date().toISOString(),
      format: "json",
      data: parsedProfile,
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="profilo-${profile.studentName}-${new Date().toISOString().split("T")[0]}.json"`,
      },
    },
  );
});
