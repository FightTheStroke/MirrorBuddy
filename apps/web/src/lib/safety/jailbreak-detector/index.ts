/**
 * MirrorBuddy Jailbreak Detector
 * Advanced detection of prompt injection and jailbreak attempts
 *
 * This module provides sophisticated detection beyond simple pattern matching:
 * - Multi-turn attack detection (building up across messages)
 * - Encoding/obfuscation detection (base64, rot13, leetspeak)
 * - Context-aware threat scoring
 * - Conversation history analysis
 *
 * Related: #30 Safety Guardrails Issue, S-04 Task
 */

// Types
export type {
  ThreatLevel,
  JailbreakCategory,
  JailbreakDetection,
  ConversationContext,
} from "./types";

// Patterns
export {
  ROLE_OVERRIDE_PATTERNS,
  INSTRUCTION_IGNORE_PATTERNS,
  SYSTEM_EXTRACTION_PATTERNS,
  HYPOTHETICAL_PATTERNS,
  EMOTIONAL_PATTERNS,
  AUTHORITY_PATTERNS,
  BUILDUP_PATTERNS,
  OBVIOUS_JAILBREAK_PATTERNS,
  PROMPT_LEAKING_PATTERNS,
  SYSTEM_FORGERY_PATTERNS,
  CODE_INJECTION_PATTERNS,
  OUTPUT_HIJACKING_PATTERNS,
  CRESCENDO_PATTERNS,
} from "./patterns";

// Utils
export { detectEncoding, calculateThreatScore } from "./utils";

// Core functions
export {
  detectJailbreak,
  isObviousJailbreak,
  getJailbreakResponse,
  buildContext,
} from "./detector";
