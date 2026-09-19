/**
 * Feature Flags Service
 * Handles feature flag CRUD operations
 */

import { prisma } from '@/lib/db';
import { getFlag, updateFlag } from '@/lib/feature-flags';
import { requireConfirmedPolicy } from '@/lib/feature-flags/policy-write-outcome';
import type { PolicyWriteReceipt } from '@/lib/feature-flags/policy-write-types';
import { FeatureFlagState, FeatureFlagUpdate } from './control-panel-types';

/**
 * Get all feature flags from database
 */
export async function getFeatureFlags(): Promise<FeatureFlagState[]> {
  const flags = await prisma.featureFlag.findMany();
  return flags.map((flag) => ({
    id: flag.id,
    name: flag.name,
    description: flag.description,
    status: flag.status as 'enabled' | 'disabled' | 'degraded',
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
): Promise<FeatureFlagState & PolicyWriteReceipt> {
  if (!update) throw new TypeError('A policy update is required');
  const receipt = requireConfirmedPolicy(
    await updateFlag(flagId, { ...update, updatedBy: adminId }),
  );
  const updated = getFlag(flagId);
  if (!updated) throw new Error('Unknown feature flag');
  return {
    ...receipt,
    id: updated.id,
    name: updated.name,
    description: updated.description,
    status: receipt.effective.status,
    enabledPercentage: receipt.effective.enabledPercentage,
    killSwitch: receipt.effective.killSwitch,
    killSwitchReason: receipt.effective.killSwitchReason ?? undefined,
    updatedAt: updated.updatedAt,
    updatedBy: updated.updatedBy ?? undefined,
  };
}
