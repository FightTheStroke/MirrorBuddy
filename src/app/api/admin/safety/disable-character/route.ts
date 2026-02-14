/**
 * Admin Safety - Disable Character API
 * F-15 - Human oversight intervention for high-risk AI systems
 * Compliance: AI Act Art.14 (human oversight)
 *
 * Disables a character when safety concerns are detected.
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { logAdminAction } from "@/lib/admin/audit-service";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";


export const revalidate = 0;
const log = logger.child({ module: "safety-intervention" });

export const POST = pipe(
  withSentry("/api/admin/safety/disable-character"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = (await ctx.req.json()) as {
    characterId: string;
    reason?: string;
  };

  const { characterId, reason } = body;

  if (!characterId) {
    return NextResponse.json(
      { error: "Character ID is required" },
      { status: 400 },
    );
  }

  // Upsert: disable existing config or create disabled entry (ADR 0105)
  const result = await prisma.characterConfig.upsert({
    where: { characterId },
    update: { isEnabled: false, updatedBy: ctx.userId! },
    create: {
      characterId,
      type: "MAESTRO",
      isEnabled: false,
      updatedBy: ctx.userId!,
    },
  });

  await logAdminAction({
    action: "DISABLE_CHARACTER",
    entityType: "CharacterConfig",
    entityId: result.id,
    adminId: ctx.userId!,
    details: {
      reason: reason || "Safety intervention",
      characterId,
    },
  });

  log.info("Character disabled via safety intervention", {
    characterId,
    adminId: ctx.userId,
    reason,
  });

  return NextResponse.json({
    success: true,
    character: {
      id: result.id,
      characterId: result.characterId,
      isEnabled: result.isEnabled,
    },
  });
});
