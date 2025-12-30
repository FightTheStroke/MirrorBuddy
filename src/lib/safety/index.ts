/**
 * ConvergioEdu Safety Module
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
  IT_CONTENT_PATTERNS,
  injectSafetyGuardrails,
  hasSafetyGuardrails,
  containsCrisisKeywords,
  CRISIS_RESPONSE,
  type SafetyInjectionOptions,
} from './safety-prompts';

export {
  filterInput,
  isInputBlocked,
  getFilterResponse,
  filterMessages,
  hasBlockedMessage,
  type FilterResult,
  type FilterSeverity,
  type FilterAction,
} from './content-filter';

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
} from './jailbreak-detector';

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
} from './age-gating';

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
