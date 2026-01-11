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
} from './safety-prompts-core';

export { IT_CONTENT_PATTERNS } from './safety-patterns';

export {
  filterInput,
  isInputBlocked,
  getFilterResponse,
  filterMessages,
  hasBlockedMessage,
  type FilterResult,
  type FilterSeverity,
  type FilterAction,
} from './content-filter-core';

export {
  sanitizeOutput,
  needsSanitization,
  validateOutput,
  StreamingSanitizer,
  type SanitizeResult,
  type SanitizeCategory,
} from './output-sanitizer';

export {
  detectJailbreak,
  isObviousJailbreak,
  getJailbreakResponse,
  buildContext,
  type JailbreakDetection,
  type JailbreakCategory,
  type ThreatLevel,
  type ConversationContext,
} from './jailbreak-detector-core';

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
} from './age-gating-core';

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
} from './monitoring';

// Server-only DB functions - import directly when needed:
// import { getSafetyEventsFromDb, ... } from '@/lib/safety/monitoring/db-queries';
