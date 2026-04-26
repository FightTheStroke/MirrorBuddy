/**
 * Kill Switch Service
 * Manages global kill switch state
 */

import { prisma } from "@/lib/db";
import { GlobalKillSwitchState } from "./control-panel-types";

/**
 * Get global kill switch state
 */
export async function getGlobalKillSwitch(): Promise<GlobalKillSwitchState> {
  const config = await prisma.globalConfig.findUnique({
    where: { id: "global" },
  });

  if (!config) {
    return {
      isEnabled: false,
      updatedAt: new Date(),
    };
  }

  return {
    isEnabled: config.killSwitch,
    reason: config.killSwitchReason ?? undefined,
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy ?? undefined,
  };
}

/**
 * Update global kill switch
 */
export async function updateGlobalKillSwitch(
  isEnabled: boolean,
  reason: string | undefined,
  adminId: string,
): Promise<GlobalKillSwitchState> {
  const config = await prisma.globalConfig.upsert({
    where: { id: "global" },
    create: {
      killSwitch: isEnabled,
      killSwitchReason: reason,
      updatedBy: adminId,
    },
    update: {
      killSwitch: isEnabled,
      killSwitchReason: reason,
      updatedAt: new Date(),
      updatedBy: adminId,
    },
  });

  return {
    isEnabled: config.killSwitch,
    reason: config.killSwitchReason ?? undefined,
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy ?? undefined,
  };
}
