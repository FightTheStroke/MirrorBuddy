/**
 * API Route: Achievement Check
 * GET /api/gamification/check - Check for newly unlocked achievements
 * WAVE 3: Returns newly unlocked achievements for toast notifications
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkAchievements } from "@/lib/gamification/db";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/gamification/check"),
  withAuth,
)(async (ctx) => {
  try {
    const userId = ctx.userId!;

    // Check for newly unlocked achievements
    const newAchievementCodes = await checkAchievements(userId);

    // If no new achievements, return empty array
    if (newAchievementCodes.length === 0) {
      return NextResponse.json({
        success: true,
        newAchievements: [],
      });
    }

    // Get full achievement details for newly unlocked achievements
    const newAchievements = await prisma.achievement.findMany({
      where: {
        code: {
          in: newAchievementCodes,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        icon: true,
        category: true,
        tier: true,
        points: true,
        isSecret: true,
      },
    });

    return NextResponse.json({
      success: true,
      newAchievements,
    });
  } catch (_error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check achievements",
      },
      { status: 500 },
    );
  }
});
