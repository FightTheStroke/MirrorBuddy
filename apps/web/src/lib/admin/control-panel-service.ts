/**
 * Control Panel Service
 * Orchestrates feature flags, maintenance mode, kill switches, and tier limits
 */

import { getFeatureFlags, updateFeatureFlag } from './control-panel-feature-flags';
import { getTierLimits, updateTierLimit } from './control-panel-tier-limits';
import { getGlobalKillSwitch, updateGlobalKillSwitch } from './control-panel-kill-switch';
import {
  MaintenanceModeState,
  MaintenanceModeUpdate,
  FeatureFlagUpdate,
  TierLimitUpdate,
} from './control-panel-types';

// In-memory cache for maintenance mode (persisted to DB as needed)
// Backward compatibility note:
// - updateMaintenanceMode/getMaintenanceMode remain the legacy in-memory API surface.
// - maintenance-service uses getMaintenanceMode() as its memory fallback.
// - getControlPanelState now reads from maintenance-service first, while preserving
//   MaintenanceModeState shape for existing control panel consumers.
let maintenanceMode: MaintenanceModeState = {
  isEnabled: false,
  customMessage: '',
  severity: 'low',
};

function normalizeMaintenanceSeverity(
  severity: string | undefined,
): MaintenanceModeState['severity'] {
  if (severity === 'medium' || severity === 'high') {
    return severity;
  }
  return 'low';
}

/**
 * Get all control panel state
 */
export async function getControlPanelState() {
  const { getMaintenanceState } = await import('../maintenance/maintenance-service');

  const [featureFlags, tiers, globalConfig, maintenanceState] = await Promise.all([
    getFeatureFlags(),
    getTierLimits(),
    getGlobalKillSwitch(),
    getMaintenanceState(),
  ]);

  return {
    featureFlags,
    maintenanceMode: {
      isEnabled: maintenanceState.isActive,
      customMessage: maintenanceState.message ?? '',
      severity: normalizeMaintenanceSeverity(maintenanceState.severity),
      estimatedEndTime: maintenanceState.estimatedEndTime,
    },
    globalKillSwitch: globalConfig,
    tierLimits: tiers,
    timestamp: new Date(),
  };
}

/**
 * Update a single feature flag
 */
export async function handleUpdateFeatureFlag(
  flagId: string,
  update: FeatureFlagUpdate,
  adminId: string,
) {
  return updateFeatureFlag(flagId, update, adminId);
}

/**
 * Update maintenance mode state
 */
export function updateMaintenanceMode(update: MaintenanceModeUpdate): MaintenanceModeState {
  maintenanceMode = {
    isEnabled: update.isEnabled,
    customMessage: update.customMessage,
    severity: update.severity,
    startedAt: update.isEnabled ? new Date() : undefined,
    estimatedEndTime: update.estimatedEndTime ? new Date(update.estimatedEndTime) : undefined,
  };
  return maintenanceMode;
}

/**
 * Get maintenance mode state
 */
export function getMaintenanceMode(): MaintenanceModeState {
  return maintenanceMode;
}

/**
 * Update global kill switch
 */
export async function handleUpdateGlobalKillSwitch(
  isEnabled: boolean,
  reason: string | undefined,
  adminId: string,
) {
  return updateGlobalKillSwitch(isEnabled, reason, adminId);
}

/**
 * Update tier limits
 */
export async function handleUpdateTierLimit(
  tierId: string,
  update: TierLimitUpdate,
  adminId: string,
) {
  return updateTierLimit(tierId, update, adminId);
}
