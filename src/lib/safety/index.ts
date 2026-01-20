/**
 * MirrorBuddy Safety Module
 *
 * Central export for all child-safety guardrails.
 * MUST be imported by any code that creates AI character prompts.
 *
 * @example
 * import { injectSafetyGuardrails } from '@/lib/safety';
 *
 * const safePrompt = injectSafetyGuardrails(maestroPrompt, { role: 'maestro' });
 */

export {
  SAFETY_CORE_PROMPT,
  injectSafetyGuardrails,
  hasSafetyGuardrails,
  containsCrisisKeywords,
  CRISIS_RESPONSE,
  type SafetyInjectionOptions,
} from "./safety-prompts-core";

export { IT_CONTENT_PATTERNS } from "./safety-patterns";

export {
  filterInput,
  isInputBlocked,
  getFilterResponse,
  filterMessages,
  hasBlockedMessage,
  type FilterResult,
  type FilterSeverity,
  type FilterAction,
} from "./content-filter-core";

export {
  sanitizeOutput,
  needsSanitization,
  validateOutput,
  StreamingSanitizer,
  type SanitizeResult,
  type SanitizeCategory,
} from "./output-sanitizer";

export {
  detectJailbreak,
  isObviousJailbreak,
  getJailbreakResponse,
  buildContext,
  type JailbreakDetection,
  type JailbreakCategory,
  type ThreatLevel,
  type ConversationContext,
} from "./jailbreak-detector";

export {
  checkAgeGate,
  filterForAge,
  getAgeBracket,
  detectTopics,
  getLanguageGuidance,
  getAgeGatePrompt,
  type AgeBracket,
  type TopicSensitivity,
  type ContentTopic,
  type AgeGateResult,
} from "./age-gating";

export {
  logSafetyEvent,
  logInputBlocked,
  logJailbreakAttempt,
  logCrisisDetected,
  logOutputSanitized,
  logHandoffToAdult,
  logAgeGateTriggered,
  getSessionEvents,
  getEventsByType,
  getEventsBySeverity,
  getMetrics,
  shouldTerminateSession,
  getSummary,
  exportEvents,
  clearEventBuffer,
  type SafetyEventType,
  type EventSeverity,
  type SafetyEvent,
  type SafetyMetrics,
} from "./monitoring";

// ============================================================================
// SERVER-ONLY MODULES - Import directly when needed (not via barrel export)
// ============================================================================
// Human Escalation (F-06 - AI Act Article 14):
//   import { escalateCrisisDetected, ... } from '@/lib/safety/escalation';
//
// DB queries:
//   import { getSafetyEventsFromDb, ... } from '@/lib/safety/monitoring/db-queries';
// ============================================================================

// Re-export types only (no runtime code)
export type {
  EscalationEvent,
  EscalationTrigger,
  EscalationSeverity,
  EscalationMetadata,
  EscalationConfig,
} from "./escalation/types";
