/**
 * Student Analytics API
 *
 * Provides learning insights and recommendations for Pro users
 * Plan 104 - Wave 4: Pro Features [T4-06]
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";
import { tierService } from "@/lib/tier";
import { generateRecommendations } from "@/lib/education/recommendation-engine";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/student-insights
 *
 * Returns AI-powered learning recommendations and insights
 * Pro tier only
 */
export const GET = pipe(
  withSentry("/api/analytics/student-insights"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  try {
    // Check tier access (Pro only)
    const tier = await tierService.getEffectiveTier(userId);
    if (tier.code.toLowerCase() !== "pro") {
      return NextResponse.json(
        { error: "Pro tier required for analytics" },
        { status: 403 },
      );
    }

    // Generate recommendations
    const recommendations = await generateRecommendations(userId);

    logger.info("Student insights retrieved", {
      userId,
      overallScore: recommendations.overallScore,
    });

    return NextResponse.json(recommendations);
  } catch (error) {
    logger.error("Failed to get student insights", { userId }, error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 },
    );
  }
});
