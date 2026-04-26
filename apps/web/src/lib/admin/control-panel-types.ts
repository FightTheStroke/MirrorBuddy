/**
 * Control Panel Types
 * Centralized types for feature flags, maintenance mode, kill switches, and tier limits
 */

export interface FeatureFlagState {
  id: string;
  name: string;
  description: string;
  status: "enabled" | "disabled" | "degraded";
  enabledPercentage: number;
  killSwitch: boolean;
  killSwitchReason?: string;
  updatedAt: Date;
  updatedBy?: string;
}

export interface MaintenanceModeState {
  isEnabled: boolean;
  customMessage: string;
  startedAt?: Date;
  estimatedEndTime?: Date;
  severity: "low" | "medium" | "high";
}

export interface GlobalKillSwitchState {
  isEnabled: boolean;
  reason?: string;
  updatedAt: Date;
  updatedBy?: string;
}

export interface TierLimitConfig {
  tierId: string;
  code: string;
  name: string;
  chatLimitDaily: number;
  voiceMinutesDaily: number;
  toolsLimitDaily: number;
  docsLimitTotal: number;
  updatedAt: Date;
}

export interface ControlPanelState {
  featureFlags: FeatureFlagState[];
  maintenanceMode: MaintenanceModeState;
  globalKillSwitch: GlobalKillSwitchState;
  tierLimits: TierLimitConfig[];
  timestamp: Date;
}

export interface FeatureFlagUpdate {
  status?: "enabled" | "disabled" | "degraded";
  enabledPercentage?: number;
  killSwitch?: boolean;
  killSwitchReason?: string;
}

export interface MaintenanceModeUpdate {
  isEnabled: boolean;
  customMessage: string;
  severity: "low" | "medium" | "high";
  estimatedEndTime?: string;
}

export interface TierLimitUpdate {
  chatLimitDaily?: number;
  voiceMinutesDaily?: number;
  toolsLimitDaily?: number;
  docsLimitTotal?: number;
}

export interface ControlPanelResponse {
  success: boolean;
  data?: ControlPanelState | FeatureFlagState | TierLimitConfig;
  error?: string;
}
