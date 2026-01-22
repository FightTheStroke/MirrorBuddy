// ============================================================================
// API ROUTE: User maestri preferences
// GET: Get selected maestri
// POST: Update maestri selection (max 3, validated against MAESTRI constant)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";

// MAESTRI constant from trial-service.ts
const MAESTRI = [
  "leonardo",
  "galileo",
  "curie",
  "cicerone",
  "lovelace",
  "smith",
  "shakespeare",
  "humboldt",
  "erodoto",
  "manzoni",
  "euclide",
  "mozart",
  "socrate",
  "ippocrate",
  "feynman",
  "darwin",
  "chris",
  "omero",
  "alexPina",
  "simone",
  "cassese",
];

const MAX_MAESTRI = 3;

// Zod schema for POST validation
const MaestriSelectionSchema = z.object({
  maestriIds: z.array(z.string()).max(MAX_MAESTRI, {
    message: `Maximum ${MAX_MAESTRI} maestri allowed`,
  }),
});

export async function GET() {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { selectedMaestri: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      selected: user.selectedMaestri,
      available: MAX_MAESTRI,
      validMaestri: MAESTRI,
    });
  } catch (error) {
    logger.error("Maestri preferences GET error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to get maestri preferences" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const body = await request.json();

    // Validate with Zod
    const validation = MaestriSelectionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid maestri selection",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 },
      );
    }

    const { maestriIds } = validation.data;

    // Validate all IDs exist in MAESTRI constant
    const invalidIds = maestriIds.filter((id) => !MAESTRI.includes(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          error: "Invalid maestri IDs",
          invalidIds,
          validMaestri: MAESTRI,
        },
        { status: 400 },
      );
    }

    // Update user's selectedMaestri
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { selectedMaestri: maestriIds },
      select: { selectedMaestri: true },
    });

    logger.info("Maestri preferences updated", {
      userId,
      maestriCount: maestriIds.length,
    });

    return NextResponse.json({
      selected: updatedUser.selectedMaestri,
      available: MAX_MAESTRI,
    });
  } catch (error) {
    logger.error("Maestri preferences POST error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to update maestri preferences" },
      { status: 500 },
    );
  }
}
