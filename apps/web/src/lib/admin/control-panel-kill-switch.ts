/**
 * Kill Switch Service
 * Manages global kill switch state
 */

import { prisma } from '@/lib/db';
import { setGlobalKillSwitch } from '@/lib/feature-flags';
import { requireConfirmedPolicy } from '@/lib/feature-flags/policy-write-outcome';
import type { PolicyWriteReceipt } from '@/lib/feature-flags/policy-write-types';
import { GlobalKillSwitchState } from './control-panel-types';

/**
 * Get global kill switch state
 */
export async function getGlobalKillSwitch(): Promise<GlobalKillSwitchState> {
  const config = await prisma.globalConfig.findUnique({
    where: { id: 'global' },
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
): Promise<GlobalKillSwitchState & PolicyWriteReceipt> {
  const receipt = requireConfirmedPolicy(await setGlobalKillSwitch(isEnabled, reason, adminId));
  return {
    ...receipt,
    isEnabled: receipt.effective.killSwitch,
    reason: receipt.effective.killSwitchReason ?? undefined,
    updatedAt: new Date(),
    updatedBy: adminId,
  };
}
