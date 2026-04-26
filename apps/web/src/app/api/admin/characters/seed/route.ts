/**
 * Character Configuration Seed API
 * POST /api/admin/characters/seed - Create CharacterConfig for all characters
 * Seeds the database with default configurations for all maestri, coaches, and buddies
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getAllMaestri } from "@/data/maestri";
import { getAllSupportTeachers } from "@/data/support-teachers";
import { getAllBuddies } from "@/data/buddy-profiles";

/**
 * POST /api/admin/characters/seed
 * Create CharacterConfig records for all characters that don't have one
 */

export const revalidate = 0;
export const POST = pipe(
  withSentry("/api/admin/characters/seed"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const userId = ctx.userId!;

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
        updatedBy: userId,
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
        updatedBy: userId,
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
        updatedBy: userId,
      },
    });
    created.push(buddy.id);
  }

  logger.info("Character configurations seeded", {
    created: created.length,
    skipped: skipped.length,
    total: created.length + skipped.length,
    adminId: userId,
  });

  return NextResponse.json({
    success: true,
    created: created.length,
    skipped: skipped.length,
    total: created.length + skipped.length,
    createdIds: created,
    skippedIds: skipped,
  });
});
