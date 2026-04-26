/**
 * Human Escalation Service
 * F-06 - AI Act Article 14: Escalation pathway for crisis/safety events
 *
 * Provides human escalation capabilities for:
 * - Crisis detection (self-harm, suicide ideation)
 * - Repeated jailbreak attempts (3+ in session)
 * - Severe content filter violations
 * - Age verification bypass attempts
 * - Forced session terminations
 */

export {
  initializeEscalationService,
  escalateCrisisDetected,
  trackJailbreakAttempt,
  getJailbreakAttemptCount,
  escalateRepeatedJailbreak,
  escalateSevereContentFilter,
  resolveEscalation,
  clearSessionEscalations,
  getEscalationConfig,
  getRecentEscalations,
  getUnresolvedEscalations,
} from "./escalation-service";

export type {
  EscalationEvent,
  EscalationTrigger,
  EscalationSeverity,
  EscalationMetadata,
  AdminNotification,
  EscalationConfig,
} from "./types";

export { DEFAULT_ESCALATION_CONFIG } from "./types";
