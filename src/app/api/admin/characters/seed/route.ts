/**
 * Character Configuration Seed API
 * POST /api/admin/characters/seed - Create CharacterConfig for all characters
 * Seeds the database with default configurations for all maestri, coaches, and buddies
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getAllMaestri } from "@/data/maestri";
import { getAllSupportTeachers } from "@/data/support-teachers";
import { getAllBuddies } from "@/data/buddy-profiles";

/**
 * POST /api/admin/characters/seed
 * Create CharacterConfig records for all characters that don't have one
 */
export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get existing configs to avoid duplicates
    const existingConfigs = await prisma.characterConfig.findMany({
      select: { characterId: true },
    });
    const existingIds = new Set(existingConfigs.map((c) => c.characterId));

    const created: string[] = [];
    const skipped: string[] = [];

    // 1. Seed maestri (26 characters)
    const maestri = getAllMaestri();
    for (const maestro of maestri) {
      if (existingIds.has(maestro.id)) {
        skipped.push(maestro.id);
        continue;
      }

      await prisma.characterConfig.create({
        data: {
          characterId: maestro.id,
          type: "MAESTRO",
          isEnabled: true,
          updatedBy: auth.userId || "admin",
        },
      });
      created.push(maestro.id);
    }

    // 2. Seed coaches (6 characters)
    const coaches = getAllSupportTeachers();
    for (const coach of coaches) {
      if (existingIds.has(coach.id)) {
        skipped.push(coach.id);
        continue;
      }

      await prisma.characterConfig.create({
        data: {
          characterId: coach.id,
          type: "COACH",
          isEnabled: true,
          updatedBy: auth.userId || "admin",
        },
      });
      created.push(coach.id);
    }

    // 3. Seed buddies (6 characters)
    const buddies = getAllBuddies();
    for (const buddy of buddies) {
      if (existingIds.has(buddy.id)) {
        skipped.push(buddy.id);
        continue;
      }

      await prisma.characterConfig.create({
        data: {
          characterId: buddy.id,
          type: "BUDDY",
          isEnabled: true,
          updatedBy: auth.userId || "admin",
        },
      });
      created.push(buddy.id);
    }

    logger.info("Character configurations seeded", {
      created: created.length,
      skipped: skipped.length,
      total: created.length + skipped.length,
      adminId: auth.userId,
    });

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      total: created.length + skipped.length,
      createdIds: created,
      skippedIds: skipped,
    });
  } catch (error) {
    logger.error("Error seeding character configs", {}, error as Error);
    return NextResponse.json(
      { error: "Failed to seed character configurations" },
      { status: 500 },
    );
  }
}
