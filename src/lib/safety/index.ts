/**
 * @module safety
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

export {
  injectSafetyGuardrails as injectSafetyGuardrails_legacy,
  hasSafetyGuardrails as hasSafetyGuardrails_legacy,
} from "./safety-prompts";

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

export type {
  EscalationEvent,
  EscalationTrigger,
  EscalationSeverity,
  EscalationMetadata,
  EscalationConfig,
} from "./escalation/types";

// ============================================================================
// AMODEI SAFETY ENHANCEMENTS (Reference: "The Adolescence of Technology" 2026)
// ============================================================================
export { checkSTEMSafety, isSTEMProfessor } from "./stem-safety";

export { normalizeUnicode } from "./versioning";

// recordContentFiltered moved to ./server.ts (requires Prisma)

export {
  recordComplianceEvent,
  recordComplianceContentFiltered,
  recordComplianceCrisisDetected,
  recordComplianceJailbreakAttempt,
  recordComplianceGuardrailTriggered,
  getComplianceEntries,
  getComplianceStatistics,
  exportComplianceAudit,
  clearComplianceBuffer,
} from "./audit/compliance-audit-service";

// escalation-service exports moved to ./server.ts (chains to @/lib/email → prisma)
