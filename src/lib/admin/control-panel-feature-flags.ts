/**
 * Feature Flags Service
 * Handles feature flag CRUD operations
 */

import { prisma } from "@/lib/db";
import {
  FeatureFlagState,
  FeatureFlagUpdate,
} from "./control-panel-types";

/**
 * Get all feature flags from database
 */
export async function getFeatureFlags(): Promise<FeatureFlagState[]> {
  const flags = await prisma.featureFlag.findMany();
  return flags.map((flag) => ({
    id: flag.id,
    name: flag.name,
    description: flag.description,
    status: flag.status as "enabled" | "disabled" | "degraded",
    enabledPercentage: flag.enabledPercentage,
    killSwitch: flag.killSwitch,
    killSwitchReason: flag.killSwitchReason ?? undefined,
    updatedAt: flag.updatedAt,
    updatedBy: flag.updatedBy ?? undefined,
  }));
}

/**
 * Update a single feature flag
 */
export async function updateFeatureFlag(
  flagId: string,
  update: FeatureFlagUpdate,
  adminId: string,
): Promise<FeatureFlagState> {
  const existing = await prisma.featureFlag.findUnique({
    where: { id: flagId },
  });

  if (!existing) {
    throw new Error(`Feature flag ${flagId} not found`);
  }

  const updated = await prisma.featureFlag.update({
    where: { id: flagId },
    data: {
      status: update.status ?? existing.status,
      enabledPercentage: update.enabledPercentage ?? existing.enabledPercentage,
      killSwitch: update.killSwitch ?? existing.killSwitch,
      killSwitchReason: update.killSwitchReason ?? existing.killSwitchReason,
      updatedAt: new Date(),
      updatedBy: adminId,
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    status: updated.status as "enabled" | "disabled" | "degraded",
    enabledPercentage: updated.enabledPercentage,
    killSwitch: updated.killSwitch,
    killSwitchReason: updated.killSwitchReason ?? undefined,
    updatedAt: updated.updatedAt,
    updatedBy: updated.updatedBy ?? undefined,
  };
}
