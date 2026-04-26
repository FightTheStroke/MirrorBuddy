/**
 * @module accessibility
 * Accessibility Module - Barrel Export
 * F-08: Feature modules con boundaries chiari
 */

export {
  useAccessibilityStore,
  defaultAccessibilitySettings,
  defaultADHDConfig,
  defaultADHDStats,
} from "./accessibility-store";

export type {
  AccessibilitySettings,
  ADHDSessionState,
  ADHDSessionConfig,
  ADHDSessionStats,
  A11yProfileId,
} from "./accessibility-store";
