/**
 * API Route: Gamification Points
 * POST /api/gamification/points - Award points
 * GET /api/gamification/points - Get points history
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  awardPoints,
  getOrCreateGamification,
  checkAchievements,
} from "@/lib/gamification/db";
import { validateJsonRequest } from "@/lib/validation/middleware";
import { AwardPointsRequestSchema } from "@/lib/validation/schemas/gamification";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";

export const GET = pipe(
  withSentry("/api/gamification/points"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const gamification = await getOrCreateGamification(userId);

  // Get recent transactions
  const transactions = await prisma.pointsTransaction.findMany({
    where: { gamificationId: gamification.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    success: true,
    totalPoints: gamification.totalPoints,
    seasonPoints: gamification.seasonPoints,
    mirrorBucks: gamification.mirrorBucks,
    transactions: transactions.map((t) => ({
      points: t.points,
      reason: t.reason,
      multiplier: t.multiplier,
      createdAt: t.createdAt,
    })),
  });
});

export const POST = pipe(
  withSentry("/api/gamification/points"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  // Validate request body
  const validation = await validateJsonRequest(
    ctx.req,
    AwardPointsRequestSchema,
  );
  if (!validation.success) {
    return validation.response;
  }

  const { points, reason, sourceId, sourceType } = validation.data;

  const result = await awardPoints(
    userId,
    points,
    reason,
    sourceId,
    sourceType,
  );

  // Check for new achievements after awarding points
  const newAchievements = await checkAchievements(userId);

  return NextResponse.json({
    success: true,
    ...result,
    newAchievements,
  });
});
