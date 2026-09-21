/**
 * Centralized feature flag checks and optimistic local safety controls.
 * Database read recovery is isolated from local overrides.
 */
import { logger } from '@/lib/logger';
import { getFlag, isGlobalKillSwitchActive } from './feature-flags-policy';
import {
  beginFeaturePolicyWrite,
  beginGlobalPolicyWrite,
  prepareWritablePolicy,
} from './policy-writer';
import { policyId, policyPatch } from './policy-write-validation';
import type { PolicyWriteReceipt } from './policy-write-types';
import type { FeatureFlagCheckResult, FeatureFlagStatus, KnownFeatureFlag } from './types';

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

export async function updateFlag(featureId: unknown, update: unknown): Promise<PolicyWriteReceipt> {
  const id = policyId.parse(featureId);
  const patch = policyPatch.parse(update);
  // Known policies must protect synchronously, before any database preparation.
  if (!getFlag(id)) await prepareWritablePolicy(id);
  return beginFeaturePolicyWrite(id, patch, 'admin').completion;
}

export async function activateKillSwitch(
  featureId: string,
  reason: string,
  updatedBy?: string,
): Promise<PolicyWriteReceipt> {
  return updateFlag(featureId, { killSwitch: true, killSwitchReason: reason, updatedBy });
}

export async function deactivateKillSwitch(
  featureId: string,
  updatedBy?: string,
): Promise<PolicyWriteReceipt> {
  return updateFlag(featureId, { killSwitch: false, updatedBy });
}

export async function setGlobalKillSwitch(
  enabled: boolean,
  reason?: string,
  updatedBy?: string,
): Promise<PolicyWriteReceipt> {
  return beginGlobalPolicyWrite(
    {
      killSwitch: enabled,
      killSwitchReason: enabled ? reason : null,
      updatedBy,
    },
    'admin',
  ).completion;
}

export async function setFlagStatus(
  featureId: string,
  status: FeatureFlagStatus,
  updatedBy?: string,
): Promise<PolicyWriteReceipt> {
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
