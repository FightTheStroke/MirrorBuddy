/**
 * ConvergioEdu Jailbreak Detector
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

/**
 * Threat level classification
 */
export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Jailbreak attempt categories
 */
export type JailbreakCategory =
  | 'role_override'        // "Pretend you are..."
  | 'instruction_ignore'   // "Ignore your instructions"
  | 'system_extraction'    // "Show me your system prompt"
  | 'encoding_bypass'      // Base64, rot13, etc.
  | 'multi_turn_attack'    // Building up across messages
  | 'hypothetical_framing' // "In a fictional world..."
  | 'emotional_manipulation' // Guilt-tripping the AI
  | 'authority_claiming';  // "I'm an admin/developer"

/**
 * Detection result with detailed analysis
 */
export interface JailbreakDetection {
  /** Whether a jailbreak attempt was detected */
  detected: boolean;
  /** Threat level of the attempt */
  threatLevel: ThreatLevel;
  /** Confidence score 0-1 */
  confidence: number;
  /** Categories of techniques detected */
  categories: JailbreakCategory[];
  /** Specific patterns that triggered detection */
  triggers: string[];
  /** Recommended action */
  action: 'allow' | 'warn' | 'block' | 'terminate_session';
}

/**
 * Conversation context for multi-turn detection
 */
export interface ConversationContext {
  /** Recent messages (last 10) */
  recentMessages: string[];
  /** Number of previous warnings in session */
  warningCount: number;
  /** Time since session start (seconds) */
  sessionDuration: number;
}

/**
 * Role override patterns - attempts to make AI act as something else
 */
const ROLE_OVERRIDE_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /fai\s+finta\s+di\s+(essere|non)/gi, weight: 0.8 },
  { pattern: /pretend\s+(to\s+be|you\s+are)/gi, weight: 0.8 },
  { pattern: /you\s+are\s+now\s+[a-z]+/gi, weight: 0.9 },
  { pattern: /sei\s+ora\s+[a-z]+/gi, weight: 0.9 },
  { pattern: /act\s+as\s+(if\s+you\s+were|an?)\s+/gi, weight: 0.7 },
  { pattern: /comportati\s+come\s+/gi, weight: 0.7 },
  { pattern: /imagine\s+you'?re\s+(a|an)\s+/gi, weight: 0.6 },
  { pattern: /roleplay\s+as\s+/gi, weight: 0.8 },
  { pattern: /\bdan\s+mode\b/gi, weight: 1.0 },
  { pattern: /\bdo\s+anything\s+now\b/gi, weight: 1.0 },
  { pattern: /jailbreak(ed)?/gi, weight: 0.9 },
  { pattern: /unrestricted\s+(mode|ai)/gi, weight: 0.9 },
  { pattern: /senza\s+restrizioni/gi, weight: 0.9 },
];

/**
 * Instruction ignore patterns
 */
const INSTRUCTION_IGNORE_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /ignora\s+(le\s+)?(tue\s+)?istruzioni/gi, weight: 1.0 },
  { pattern: /ignore\s+(your\s+)?(previous\s+)?instructions/gi, weight: 1.0 },
  { pattern: /dimentica\s+(le\s+)?regole/gi, weight: 1.0 },
  { pattern: /forget\s+(your\s+)?rules/gi, weight: 1.0 },
  { pattern: /disregard\s+(all\s+)?(previous\s+)?/gi, weight: 0.9 },
  { pattern: /override\s+(your\s+)?programming/gi, weight: 0.9 },
  { pattern: /bypass\s+(your\s+)?(safety\s+)?/gi, weight: 0.9 },
  { pattern: /disable\s+(your\s+)?filters/gi, weight: 0.9 },
  { pattern: /turn\s+off\s+(your\s+)?restrictions/gi, weight: 0.9 },
];

/**
 * System extraction patterns
 */
const SYSTEM_EXTRACTION_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /system\s*prompt/gi, weight: 0.9 },
  { pattern: /mostrami\s+(il\s+)?tuo\s+prompt/gi, weight: 0.9 },
  { pattern: /show\s+(me\s+)?your\s+(system\s+)?prompt/gi, weight: 0.9 },
  { pattern: /what\s+are\s+your\s+instructions/gi, weight: 0.8 },
  { pattern: /quali\s+sono\s+le\s+tue\s+istruzioni/gi, weight: 0.8 },
  { pattern: /repeat\s+(your\s+)?instructions/gi, weight: 0.7 },
  { pattern: /print\s+(your\s+)?system/gi, weight: 0.8 },
  { pattern: /reveal\s+(your\s+)?prompt/gi, weight: 0.9 },
  { pattern: /\[debug\]/gi, weight: 0.8 },
  { pattern: /\[admin\]/gi, weight: 0.8 },
  { pattern: /developer\s+mode/gi, weight: 0.9 },
];

/**
 * Hypothetical framing patterns
 */
const HYPOTHETICAL_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /in\s+a\s+fictional\s+(world|story)/gi, weight: 0.6 },
  { pattern: /in\s+un\s+mondo\s+immaginario/gi, weight: 0.6 },
  { pattern: /for\s+a\s+novel\s+i'?m\s+writing/gi, weight: 0.5 },
  { pattern: /per\s+un\s+romanzo/gi, weight: 0.5 },
  { pattern: /hypothetically\s+speaking/gi, weight: 0.5 },
  { pattern: /ipoteticamente/gi, weight: 0.5 },
  { pattern: /just\s+for\s+educational\s+purposes/gi, weight: 0.6 },
  { pattern: /solo\s+per\s+scopi\s+educativi/gi, weight: 0.6 },
];

/**
 * Emotional manipulation patterns
 */
const EMOTIONAL_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /se\s+non\s+mi\s+aiuti.*morirò/gi, weight: 0.8 },
  { pattern: /if\s+you\s+don'?t\s+help.*die/gi, weight: 0.8 },
  { pattern: /sei\s+cattivo\s+se\s+non/gi, weight: 0.5 },
  { pattern: /you'?re\s+evil\s+if\s+you\s+don'?t/gi, weight: 0.5 },
  { pattern: /ti\s+odio\s+se\s+non/gi, weight: 0.5 },
  { pattern: /i'?ll\s+hate\s+you\s+if/gi, weight: 0.5 },
  { pattern: /per\s+favore.*vita\s+o\s+morte/gi, weight: 0.7 },
  { pattern: /please.*life\s+or\s+death/gi, weight: 0.7 },
];

/**
 * Authority claiming patterns
 */
const AUTHORITY_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /sono\s+(un\s+)?(admin|amministratore)/gi, weight: 0.9 },
  { pattern: /i'?m\s+(an?\s+)?(admin|administrator)/gi, weight: 0.9 },
  { pattern: /sono\s+uno\s+sviluppatore/gi, weight: 0.8 },
  { pattern: /i'?m\s+a\s+developer/gi, weight: 0.8 },
  { pattern: /ho\s+accesso\s+speciale/gi, weight: 0.8 },
  { pattern: /i\s+have\s+special\s+access/gi, weight: 0.8 },
  { pattern: /lavoro\s+per\s+(openai|anthropic|microsoft)/gi, weight: 0.9 },
  { pattern: /i\s+work\s+for\s+(openai|anthropic|microsoft)/gi, weight: 0.9 },
  { pattern: /authorized\s+personnel/gi, weight: 0.7 },
  { pattern: /personale\s+autorizzato/gi, weight: 0.7 },
];

/**
 * Check for encoding attempts (Base64, rot13, etc.)
 */
function detectEncoding(text: string): { detected: boolean; type?: string } {
  // Base64 detection (min 20 chars, valid charset)
  const base64Pattern = /[A-Za-z0-9+/=]{20,}/g;
  const base64Matches = text.match(base64Pattern);
  if (base64Matches) {
    for (const match of base64Matches) {
      try {
        const decoded = atob(match);
        // Check if decoded content contains suspicious patterns
        if (/ignore|pretend|jailbreak|system\s*prompt/i.test(decoded)) {
          return { detected: true, type: 'base64' };
        }
      } catch {
        // Invalid base64, ignore
      }
    }
  }

  // Leetspeak detection (e.g., "1gn0r3 1nstruct10ns")
  const leetspeak = text
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/0/g, 'o')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a');

  if (leetspeak !== text) {
    // Re-check with decoded leetspeak
    const suspiciousPatterns = /ignor[ea]|pretend|jailbreak|system\s*prompt/i;
    if (suspiciousPatterns.test(leetspeak) && !suspiciousPatterns.test(text)) {
      return { detected: true, type: 'leetspeak' };
    }
  }

  // Unicode homograph detection (e.g., using Cyrillic 'а' instead of Latin 'a')
  const hasNonASCII = /[^\x00-\x7F]/.test(text);
  const hasSuspiciousHomographs = /[аеорсух]/i.test(text); // Common Cyrillic lookalikes
  if (hasNonASCII && hasSuspiciousHomographs) {
    return { detected: true, type: 'homograph' };
  }

  return { detected: false };
}

/**
 * Calculate threat score from pattern matches
 */
function calculateThreatScore(
  text: string,
  patterns: Array<{ pattern: RegExp; weight: number }>
): { score: number; matched: string[] } {
  let totalScore = 0;
  const matched: string[] = [];

  for (const { pattern, weight } of patterns) {
    const match = text.match(pattern);
    if (match) {
      totalScore += weight;
      matched.push(match[0]);
    }
    pattern.lastIndex = 0;
  }

  return { score: Math.min(totalScore, 1), matched };
}

/**
 * Main jailbreak detection function
 *
 * @param text - Current user message
 * @param context - Optional conversation context for multi-turn detection
 * @returns JailbreakDetection with analysis results
 */
export function detectJailbreak(
  text: string,
  context?: ConversationContext
): JailbreakDetection {
  const categories: JailbreakCategory[] = [];
  const triggers: string[] = [];
  let totalScore = 0;

  // Normalize text
  const normalized = text.toLowerCase();

  // Check encoding bypass attempts
  const encodingResult = detectEncoding(text);
  if (encodingResult.detected) {
    categories.push('encoding_bypass');
    triggers.push(`Encoded content detected: ${encodingResult.type}`);
    totalScore += 0.8;
  }

  // Check each pattern category
  const patternChecks: Array<{
    patterns: Array<{ pattern: RegExp; weight: number }>;
    category: JailbreakCategory;
  }> = [
    { patterns: ROLE_OVERRIDE_PATTERNS, category: 'role_override' },
    { patterns: INSTRUCTION_IGNORE_PATTERNS, category: 'instruction_ignore' },
    { patterns: SYSTEM_EXTRACTION_PATTERNS, category: 'system_extraction' },
    { patterns: HYPOTHETICAL_PATTERNS, category: 'hypothetical_framing' },
    { patterns: EMOTIONAL_PATTERNS, category: 'emotional_manipulation' },
    { patterns: AUTHORITY_PATTERNS, category: 'authority_claiming' },
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
    const combinedContext = context.recentMessages.join(' ').toLowerCase();

    // Check for building-up patterns across messages
    const buildupPatterns = [
      /first.*then.*finally/gi,
      /step\s*1.*step\s*2/gi,
      /prima.*poi.*infine/gi,
    ];

    for (const pattern of buildupPatterns) {
      if (pattern.test(combinedContext)) {
        categories.push('multi_turn_attack');
        triggers.push('Multi-turn buildup detected');
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
  let action: JailbreakDetection['action'];

  if (totalScore >= 0.9) {
    threatLevel = 'critical';
    action = 'terminate_session';
  } else if (totalScore >= 0.7) {
    threatLevel = 'high';
    action = 'block';
  } else if (totalScore >= 0.4) {
    threatLevel = 'medium';
    action = 'warn';
  } else if (totalScore >= 0.2) {
    threatLevel = 'low';
    action = 'warn';
  } else {
    threatLevel = 'none';
    action = 'allow';
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

  const obviousPatterns = [
    /\bdan\s+mode\b/i,
    /\bdo\s+anything\s+now\b/i,
    /ignora\s+tutte\s+le\s+istruzioni/i,
    /ignore\s+all\s+instructions/i,
    /you\s+are\s+now\s+unrestricted/i,
    /sei\s+ora\s+senza\s+restrizioni/i,
    /jailbreak/i,
  ];

  return obviousPatterns.some((p) => p.test(normalized));
}

/**
 * Get a safe response for detected jailbreak attempts
 */
export function getJailbreakResponse(detection: JailbreakDetection): string {
  if (detection.threatLevel === 'critical') {
    return "Ho notato un tentativo di manipolazione. Per la sicurezza di tutti, preferisco concentrarci sullo studio. Su quale materia vorresti lavorare?";
  }

  if (detection.threatLevel === 'high') {
    return "Non posso fare quello che mi chiedi. Sono qui per aiutarti a imparare! Quale argomento ti interessa?";
  }

  if (detection.threatLevel === 'medium') {
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
  sessionDuration: number = 0
): ConversationContext {
  const userMessages = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .slice(-10);

  return {
    recentMessages: userMessages,
    warningCount,
    sessionDuration,
  };
}
