// ============================================================================
// API ROUTE: User profile
// GET: Get current profile
// PUT: Update profile
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";

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

export async function GET() {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

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
  } catch (error) {
    logger.error("Profile GET error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to get profile" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const body = await request.json();

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
  } catch (error) {
    logger.error("Profile PUT error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
