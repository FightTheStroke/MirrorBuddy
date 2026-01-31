/**
 * Character Configuration Admin API
 * PATCH /api/admin/characters/[id] - Toggle/edit character settings
 * Upserts CharacterConfig (creates if doesn't exist)
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getAllMaestri } from "@/data/maestri";
import { getAllSupportTeachers } from "@/data/support-teachers";
import { getAllBuddies } from "@/data/buddy-profiles";
import type { CharacterType } from "@prisma/client";

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
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: characterId } = await params;
    const body: UpdateCharacterRequest = await request.json();

    // Validate character exists in data files
    const characterType = getCharacterType(characterId);
    if (!characterType) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 },
      );
    }

    // Upsert CharacterConfig
    const config = await prisma.characterConfig.upsert({
      where: { characterId },
      create: {
        characterId,
        type: characterType,
        isEnabled: body.isEnabled ?? true,
        displayNameOverride: body.displayNameOverride || null,
        descriptionOverride: body.descriptionOverride || null,
        updatedBy: auth.userId || "admin",
      },
      update: {
        ...(body.isEnabled !== undefined && { isEnabled: body.isEnabled }),
        ...(body.displayNameOverride !== undefined && {
          displayNameOverride: body.displayNameOverride || null,
        }),
        ...(body.descriptionOverride !== undefined && {
          descriptionOverride: body.descriptionOverride || null,
        }),
        updatedBy: auth.userId || "admin",
      },
    });

    logger.info("Character configuration updated", {
      characterId,
      isEnabled: config.isEnabled,
      updatedBy: auth.userId,
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    logger.error("Error updating character config", {}, error as Error);
    return NextResponse.json(
      { error: "Failed to update character configuration" },
      { status: 500 },
    );
  }
}
