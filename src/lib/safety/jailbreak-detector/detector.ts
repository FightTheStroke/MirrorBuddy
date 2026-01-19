/**
 * Jailbreak Detection Core
 * Main detection functions
 *
 * Related: #30 Safety Guardrails Issue, S-04 Task
 */

import type {
  ThreatLevel,
  JailbreakCategory,
  JailbreakDetection,
  ConversationContext,
} from "./types";
import {
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
import { detectEncoding, calculateThreatScore } from "./utils";

/**
 * Main jailbreak detection function
 *
 * @param text - Current user message
 * @param context - Optional conversation context for multi-turn detection
 * @returns JailbreakDetection with analysis results
 */
export function detectJailbreak(
  text: string,
  context?: ConversationContext,
): JailbreakDetection {
  const categories: JailbreakCategory[] = [];
  const triggers: string[] = [];
  let totalScore = 0;

  // Normalize text
  const normalized = text.toLowerCase();

  // Check encoding bypass attempts
  const encodingResult = detectEncoding(text);
  if (encodingResult.detected) {
    categories.push("encoding_bypass");
    triggers.push(`Encoded content detected: ${encodingResult.type}`);
    totalScore += 0.8;
  }

  // Check each pattern category
  const patternChecks: Array<{
    patterns: Array<{ pattern: RegExp; weight: number }>;
    category: JailbreakCategory;
  }> = [
    { patterns: ROLE_OVERRIDE_PATTERNS, category: "role_override" },
    { patterns: INSTRUCTION_IGNORE_PATTERNS, category: "instruction_ignore" },
    { patterns: SYSTEM_EXTRACTION_PATTERNS, category: "system_extraction" },
    { patterns: HYPOTHETICAL_PATTERNS, category: "hypothetical_framing" },
    { patterns: EMOTIONAL_PATTERNS, category: "emotional_manipulation" },
    { patterns: AUTHORITY_PATTERNS, category: "authority_claiming" },
    { patterns: PROMPT_LEAKING_PATTERNS, category: "prompt_leaking" },
    { patterns: SYSTEM_FORGERY_PATTERNS, category: "system_forgery" },
    { patterns: CODE_INJECTION_PATTERNS, category: "code_injection" },
    { patterns: OUTPUT_HIJACKING_PATTERNS, category: "output_hijacking" },
    { patterns: CRESCENDO_PATTERNS, category: "crescendo_attack" },
  ];

  for (const { patterns, category } of patternChecks) {
    const result = calculateThreatScore(normalized, patterns);
    if (result.score > 0) {
      categories.push(category);
      triggers.push(...result.matched);
      totalScore += result.score;
    }
  }

  // Multi-turn attack detection
  if (context && context.recentMessages.length > 2) {
    const combinedContext = context.recentMessages.join(" ").toLowerCase();

    // Check for building-up patterns across messages
    for (const pattern of BUILDUP_PATTERNS) {
      if (pattern.test(combinedContext)) {
        categories.push("multi_turn_attack");
        triggers.push("Multi-turn buildup detected");
        totalScore += 0.5;
        break;
      }
    }

    // Repeated warning escalation
    if (context.warningCount >= 2) {
      totalScore += 0.3;
      triggers.push(`Previous warnings: ${context.warningCount}`);
    }
  }

  // Normalize total score
  totalScore = Math.min(totalScore, 1);

  // Determine threat level and action
  let threatLevel: ThreatLevel;
  let action: JailbreakDetection["action"];

  if (totalScore >= 0.9) {
    threatLevel = "critical";
    action = "terminate_session";
  } else if (totalScore >= 0.7) {
    threatLevel = "high";
    action = "block";
  } else if (totalScore >= 0.4) {
    threatLevel = "medium";
    action = "warn";
  } else if (totalScore >= 0.2) {
    threatLevel = "low";
    action = "warn";
  } else {
    threatLevel = "none";
    action = "allow";
  }

  return {
    detected: totalScore >= 0.2,
    threatLevel,
    confidence: totalScore,
    categories,
    triggers,
    action,
  };
}

/**
 * Quick check for obvious jailbreak attempts
 * Use for fast-path rejection before full analysis
 */
export function isObviousJailbreak(text: string): boolean {
  const normalized = text.toLowerCase();
  return OBVIOUS_JAILBREAK_PATTERNS.some((p) => p.test(normalized));
}

/**
 * Get a safe response for detected jailbreak attempts
 */
export function getJailbreakResponse(detection: JailbreakDetection): string {
  if (detection.threatLevel === "critical") {
    return "Ho notato un tentativo di manipolazione. Per la sicurezza di tutti, preferisco concentrarci sullo studio. Su quale materia vorresti lavorare?";
  }

  if (detection.threatLevel === "high") {
    return "Non posso fare quello che mi chiedi. Sono qui per aiutarti a imparare! Quale argomento ti interessa?";
  }

  if (detection.threatLevel === "medium") {
    return "Hmm, non sono sicuro di aver capito cosa vuoi. Posso aiutarti con matematica, italiano, scienze... cosa preferisci?";
  }

  // Low threat - gentle redirect
  return "Sono qui per aiutarti con lo studio! Su quale materia vuoi lavorare oggi?";
}

/**
 * Build conversation context from message history
 */
export function buildContext(
  messages: Array<{ role: string; content: string }>,
  warningCount: number = 0,
  sessionDuration: number = 0,
): ConversationContext {
  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .slice(-10);

  return {
    recentMessages: userMessages,
    warningCount,
    sessionDuration,
  };
}
