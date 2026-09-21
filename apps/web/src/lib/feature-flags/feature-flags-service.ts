/**
 * Centralized feature flag checks and optimistic local safety controls.
 * Database read recovery is isolated from local overrides.
 */
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  getFlag,
  isGlobalKillSwitchActive,
  applyLocalUpdate,
  applyLocalGlobalPolicy,
} from './feature-flags-policy';
import type {
  FeatureFlag,
  FeatureFlagCheckResult,
  FeatureFlagStatus,
  FeatureFlagUpdate,
  KnownFeatureFlag,
} from './types';

export {
  initializeFlags,
  reloadFlags,
  getFlag,
  getAllFlags,
  isGlobalKillSwitchActive,
  getGlobalKillSwitchReason,
  isUsingFallbackDefaults,
  _resetForTesting,
} from './feature-flags-policy';

export function isFeatureEnabled(
  featureId: KnownFeatureFlag,
  userId?: string,
): FeatureFlagCheckResult {
  const flag = getFlag(featureId);
  if (!flag) {
    logger.warn('Unknown feature flag checked', { featureId });
    return {
      enabled: false,
      reason: 'disabled',
      flag: {
        id: featureId,
        name: featureId,
        description: 'Unknown feature',
        status: 'disabled',
        enabledPercentage: 0,
        killSwitch: false,
        updatedAt: new Date(),
      },
    };
  }
  if (isGlobalKillSwitchActive() || flag.killSwitch) {
    return { enabled: false, reason: 'kill_switch', flag };
  }
  if (flag.status === 'disabled') {
    return { enabled: false, reason: 'disabled', flag };
  }
  if (flag.status === 'degraded') {
    return { enabled: true, reason: 'degraded', flag };
  }
  if (flag.enabledPercentage < 100 && userId) {
    const bucket = simpleHash(userId + featureId) % 100;
    if (bucket >= flag.enabledPercentage) {
      return { enabled: false, reason: 'percentage_rollout', flag };
    }
  }
  return { enabled: true, reason: 'enabled', flag };
}

export async function updateFlag(
  featureId: KnownFeatureFlag,
  update: FeatureFlagUpdate,
): Promise<FeatureFlag | null> {
  if (!getFlag(featureId)) {
    logger.warn('Attempted to update unknown flag', { featureId });
    return null;
  }
  // A database reload must never revoke an immediate local safety control.
  applyLocalUpdate(featureId, update);
  const updated = getFlag(featureId);
  if (!updated) throw new Error('Feature flag disappeared during local update');
  try {
    const dbData = {
      status: updated.status,
      enabledPercentage: updated.enabledPercentage,
      killSwitch: updated.killSwitch,
      killSwitchReason: update.killSwitch ? (update.metadata?.reason as string) : null,
      metadata: updated.metadata ? JSON.parse(JSON.stringify(updated.metadata)) : undefined,
      updatedBy: update.updatedBy,
    };
    await prisma.featureFlag.upsert({
      where: { id: featureId },
      update: dbData,
      create: {
        id: featureId,
        name: updated.name,
        description: updated.description,
        ...dbData,
      },
    });
  } catch (error) {
    logger.error('Failed to persist flag update', { featureId }, error);
  }
  logger.info('Feature flag updated', {
    featureId,
    status: updated.status,
    killSwitch: updated.killSwitch,
    updatedBy: update.updatedBy,
  });
  return updated;
}

export async function activateKillSwitch(
  featureId: KnownFeatureFlag,
  reason: string,
  updatedBy?: string,
): Promise<void> {
  await updateFlag(featureId, { killSwitch: true, metadata: { reason }, updatedBy });
  logger.error('Kill-switch activated', { featureId, reason, updatedBy });
}

export async function deactivateKillSwitch(
  featureId: KnownFeatureFlag,
  updatedBy?: string,
): Promise<void> {
  await updateFlag(featureId, { killSwitch: false, updatedBy });
  logger.info('Kill-switch deactivated', { featureId, updatedBy });
}

export async function setGlobalKillSwitch(enabled: boolean, reason?: string): Promise<void> {
  applyLocalGlobalPolicy(enabled, reason);
  try {
    await prisma.globalConfig.upsert({
      where: { id: 'global' },
      update: { killSwitch: enabled, killSwitchReason: reason },
      create: { id: 'global', killSwitch: enabled, killSwitchReason: reason },
    });
  } catch (error) {
    logger.error('Failed to persist global kill-switch', undefined, error);
  }
  if (enabled) {
    logger.error('GLOBAL kill-switch activated', { reason });
  } else {
    logger.info('GLOBAL kill-switch deactivated');
  }
}

export async function setFlagStatus(
  featureId: KnownFeatureFlag,
  status: FeatureFlagStatus,
  updatedBy?: string,
): Promise<FeatureFlag | null> {
  return updateFlag(featureId, { status, updatedBy });
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}
