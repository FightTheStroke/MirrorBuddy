/**
 * Character Configuration Admin API
 * PATCH /api/admin/characters/[id] - Toggle/edit character settings
 * Upserts CharacterConfig (creates if doesn't exist)
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getClientIp, logAdminAction } from "@/lib/admin/audit-service";
import { getAllMaestri } from "@/data/maestri";
import { getAllSupportTeachers } from "@/data/support-teachers";
import { getAllBuddies } from "@/data/buddy-profiles";
import type { CharacterType } from "@prisma/client";


export const revalidate = 0;
interface UpdateCharacterRequest {
  isEnabled?: boolean;
  displayNameOverride?: string;
  descriptionOverride?: string;
}

/**
 * Determine character type from character ID
 */
function getCharacterType(characterId: string): CharacterType | null {
  const maestri = getAllMaestri();
  const coaches = getAllSupportTeachers();
  const buddies = getAllBuddies();

  if (maestri.find((m) => m.id === characterId)) {
    return "MAESTRO";
  }
  if (coaches.find((c) => c.id === characterId)) {
    return "COACH";
  }
  if (buddies.find((b) => b.id === characterId)) {
    return "BUDDY";
  }
  return null;
}

/**
 * PATCH /api/admin/characters/[id]
 * Update character configuration (upsert)
 */
export const PATCH = pipe(
  withSentry("/api/admin/characters/:id"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { id: characterId } = await ctx.params;
  const body: UpdateCharacterRequest = await ctx.req.json();

  // Validate character exists in data files
  const characterType = getCharacterType(characterId);
  if (!characterType) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  const existingConfig = await prisma.characterConfig.findUnique({
    where: { characterId },
  });

  // Upsert CharacterConfig
  const config = await prisma.characterConfig.upsert({
    where: { characterId },
    create: {
      characterId,
      type: characterType,
      isEnabled: body.isEnabled ?? true,
      displayNameOverride: body.displayNameOverride || null,
      descriptionOverride: body.descriptionOverride || null,
      updatedBy: userId,
    },
    update: {
      ...(body.isEnabled !== undefined && { isEnabled: body.isEnabled }),
      ...(body.displayNameOverride !== undefined && {
        displayNameOverride: body.displayNameOverride || null,
      }),
      ...(body.descriptionOverride !== undefined && {
        descriptionOverride: body.descriptionOverride || null,
      }),
      updatedBy: userId,
    },
  });

  logger.info("Character configuration updated", {
    characterId,
    isEnabled: config.isEnabled,
    updatedBy: userId,
  });

  const action =
    body.isEnabled !== undefined &&
    body.displayNameOverride === undefined &&
    body.descriptionOverride === undefined
      ? "character.toggle"
      : "character.update";

  await logAdminAction({
    action,
    entityType: "CharacterConfig",
    entityId: config.id,
    adminId: userId,
    ipAddress: getClientIp(ctx.req),
    details: {
      characterId,
      characterType,
      previous: existingConfig
        ? {
            isEnabled: existingConfig.isEnabled,
            displayNameOverride: existingConfig.displayNameOverride,
            descriptionOverride: existingConfig.descriptionOverride,
          }
        : null,
      current: {
        isEnabled: config.isEnabled,
        displayNameOverride: config.displayNameOverride,
        descriptionOverride: config.descriptionOverride,
      },
    },
  });

  return NextResponse.json({ success: true, config });
});
