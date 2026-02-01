// ============================================================================
// API ROUTE: User profile
// GET: Get current profile
// PUT: Update profile
// ============================================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";

// #92: Zod schema for profile validation
const ProfileUpdateSchema = z
  .object({
    name: z.string().max(100).optional(),
    age: z.number().int().min(5).max(100).optional(),
    schoolYear: z.number().int().min(1).max(13).optional(),
    schoolLevel: z.enum(["elementare", "media", "superiore"]).optional(),
    gradeLevel: z.string().max(20).optional(),
    learningGoals: z.array(z.string().max(200)).max(20).optional(),
    preferredCoach: z
      .enum(["melissa", "roberto", "chiara", "andrea", "favij"])
      .nullable()
      .optional(),
    preferredBuddy: z
      .enum(["mario", "noemi", "enea", "bruno", "sofia"])
      .nullable()
      .optional(),
  })
  .strict();

export const GET = pipe(
  withSentry("/api/user/profile"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const profile = await prisma.profile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  // Parse learningGoals from JSON string
  return NextResponse.json({
    ...profile,
    learningGoals: JSON.parse(profile.learningGoals || "[]"),
  });
});

export const PUT = pipe(
  withSentry("/api/user/profile"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body = await ctx.req.json();

  // #92: Validate with Zod before processing
  const validation = ProfileUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid profile data",
        details: validation.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  const data = validation.data;

  // Prepare update data
  const updateData: Record<string, unknown> = { ...data };

  // Stringify learningGoals if it's an array
  if (Array.isArray(updateData.learningGoals)) {
    updateData.learningGoals = JSON.stringify(updateData.learningGoals);
  }

  const profile = await prisma.profile.upsert({
    where: { userId },
    update: updateData,
    create: { userId, ...updateData },
  });

  return NextResponse.json({
    ...profile,
    learningGoals: JSON.parse(profile.learningGoals || "[]"),
  });
});
