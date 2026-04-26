/**
 * Accessibility Telemetry Helper
 * Tracks accessibility feature usage for analytics dashboard
 */

import { useTelemetryStore } from "@/lib/telemetry";
import type { A11yProfileId } from "./accessibility-store";

export type A11yAction =
  | "profile_activated"
  | "setting_changed"
  | "reset_to_defaults"
  | "browser_prefs_applied"
  | "panel_opened"
  | "panel_closed";

interface A11yEventMetadata {
  profileId?: A11yProfileId;
  settingName?: string;
  settingValue?: boolean | number | string;
  source?: "panel" | "settings" | "auto";
}

/**
 * Track an accessibility event
 */
export function trackA11yEvent(
  action: A11yAction,
  metadata?: A11yEventMetadata,
): void {
  const store = useTelemetryStore.getState();

  // Convert metadata to telemetry format
  const telemetryMetadata: Record<string, string | number | boolean> = {};

  if (metadata?.profileId) {
    telemetryMetadata.profileId = metadata.profileId;
  }
  if (metadata?.settingName) {
    telemetryMetadata.settingName = metadata.settingName;
  }
  if (metadata?.settingValue !== undefined) {
    telemetryMetadata.settingValue = metadata.settingValue;
  }
  if (metadata?.source) {
    telemetryMetadata.source = metadata.source;
  }

  store.trackEvent(
    "accessibility",
    action,
    metadata?.profileId ?? metadata?.settingName,
    undefined,
    telemetryMetadata,
  );
}

/**
 * Track profile activation
 */
export function trackProfileActivation(profileId: A11yProfileId): void {
  if (!profileId) return;
  trackA11yEvent("profile_activated", { profileId, source: "panel" });
}

/**
 * Track setting change
 */
export function trackSettingChange(
  settingName: string,
  settingValue: boolean | number | string,
): void {
  trackA11yEvent("setting_changed", { settingName, settingValue });
}

/**
 * Track reset to defaults
 */
export function trackReset(): void {
  trackA11yEvent("reset_to_defaults");
}
