/**
 * Tier Limits Service
 * Handles tier limit management
 */

import { prisma } from "@/lib/db";
import {
  TierLimitConfig,
  TierLimitUpdate,
} from "./control-panel-types";

/**
 * Get tier limits
 */
export async function getTierLimits(): Promise<TierLimitConfig[]> {
  const tiers = await prisma.tierDefinition.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return tiers.map((tier) => ({
    tierId: tier.id,
    code: tier.code,
    name: tier.name,
    chatLimitDaily: tier.chatLimitDaily,
    voiceMinutesDaily: tier.voiceMinutesDaily,
    toolsLimitDaily: tier.toolsLimitDaily,
    docsLimitTotal: tier.docsLimitTotal,
    updatedAt: tier.updatedAt,
  }));
}

/**
 * Update tier limits
 */
export async function updateTierLimit(
  tierId: string,
  update: TierLimitUpdate,
  adminId: string,
): Promise<TierLimitConfig> {
  const tier = await prisma.tierDefinition.findUnique({
    where: { id: tierId },
  });

  if (!tier) {
    throw new Error(`Tier ${tierId} not found`);
  }

  const updated = await prisma.tierDefinition.update({
    where: { id: tierId },
    data: {
      chatLimitDaily: update.chatLimitDaily ?? tier.chatLimitDaily,
      voiceMinutesDaily: update.voiceMinutesDaily ?? tier.voiceMinutesDaily,
      toolsLimitDaily: update.toolsLimitDaily ?? tier.toolsLimitDaily,
      docsLimitTotal: update.docsLimitTotal ?? tier.docsLimitTotal,
      updatedAt: new Date(),
    },
  });

  // Log the change to audit trail
  await prisma.tierAuditLog.create({
    data: {
      tierId: tier.id,
      adminId,
      action: "TIER_UPDATE",
      changes: {
        old: {
          chatLimitDaily: tier.chatLimitDaily,
          voiceMinutesDaily: tier.voiceMinutesDaily,
          toolsLimitDaily: tier.toolsLimitDaily,
          docsLimitTotal: tier.docsLimitTotal,
        },
        new: {
          chatLimitDaily: updated.chatLimitDaily,
          voiceMinutesDaily: updated.voiceMinutesDaily,
          toolsLimitDaily: updated.toolsLimitDaily,
          docsLimitTotal: updated.docsLimitTotal,
        },
      },
    },
  });

  return {
    tierId: updated.id,
    code: updated.code,
    name: updated.name,
    chatLimitDaily: updated.chatLimitDaily,
    voiceMinutesDaily: updated.voiceMinutesDaily,
    toolsLimitDaily: updated.toolsLimitDaily,
    docsLimitTotal: updated.docsLimitTotal,
    updatedAt: updated.updatedAt,
  };
}
