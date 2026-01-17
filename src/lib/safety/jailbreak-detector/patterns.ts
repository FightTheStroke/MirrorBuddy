/**
 * Jailbreak Detection Patterns
 * Pattern definitions for detecting prompt injection attempts
 *
 * Related: #30 Safety Guardrails Issue, S-04 Task
 */

/**
 * Role override patterns - attempts to make AI act as something else
 */
export const ROLE_OVERRIDE_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
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
export const INSTRUCTION_IGNORE_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
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
export const SYSTEM_EXTRACTION_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
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
export const HYPOTHETICAL_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
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
export const EMOTIONAL_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
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
export const AUTHORITY_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
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
 * Multi-turn buildup patterns
 */
export const BUILDUP_PATTERNS: RegExp[] = [
  /first.*then.*finally/gi,
  /step\s*1.*step\s*2/gi,
  /prima.*poi.*infine/gi,
];

/**
 * Obvious jailbreak patterns for quick detection
 */
export const OBVIOUS_JAILBREAK_PATTERNS: RegExp[] = [
  /\bdan\s+mode\b/i,
  /\bdo\s+anything\s+now\b/i,
  /ignora\s+tutte\s+le\s+istruzioni/i,
  /ignore\s+all\s+instructions/i,
  /you\s+are\s+now\s+unrestricted/i,
  /sei\s+ora\s+senza\s+restrizioni/i,
  /jailbreak/i,
];
