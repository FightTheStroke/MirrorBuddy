/**
 * Safety Versioning Module
 * Part of Ethical Design Hardening (F-13, F-14, F-15, F-16, F-17)
 *
 * Provides version management, jailbreak flagging, throttling,
 * and unicode normalization for safety systems.
 */

// Types
export type {
  SafetyRule,
  SafetyRuleCategory,
  SafetyAction,
  SafetyVersion,
  VersionChange,
  JailbreakAttempt,
  SessionThrottleState,
  ThrottleConfig,
} from './types';

export { DEFAULT_THROTTLE_CONFIG } from './types';

// Version Manager (F-13)
export {
  initializeDefaultVersion,
  createNewVersion,
  activateVersion,
  rollbackVersion,
  getActiveVersion,
  getVersion,
  getAllVersions,
  getActiveRules,
  formatChangelog,
  isValidVersionNumber,
  compareVersions,
} from './version-manager';

// Jailbreak Flagging (F-15)
export {
  flagJailbreakAttempt,
  getPendingReviews,
  markReviewed,
  getJailbreakStatistics,
  isKnownPattern,
  getKnownPatterns,
} from './jailbreak-flagging';

// Session Throttling (F-16)
export {
  isThrottled,
  recordAttemptAndCheckThrottle,
  clearThrottleState,
  getThrottleStatistics,
  cleanupExpiredStates,
} from './session-throttling';

// Unicode Normalizer (F-17)
export {
  normalizeUnicode,
  containsSuspiciousUnicode,
  analyzeUnicodeContent,
  type NormalizationChange,
} from './unicode-normalizer';
