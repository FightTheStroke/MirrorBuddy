/**
 * ConvergioEdu Content Filter
 * Input validation and filtering for child safety
 *
 * This module filters user input BEFORE it reaches the AI model.
 * It detects and handles:
 * - Profanity (Italian + English)
 * - Explicit content requests
 * - Jailbreak/injection attempts
 * - Crisis/distress signals
 *
 * Related: #30 Safety Guardrails Issue, S-02 Task
 */

import { containsCrisisKeywords, IT_CONTENT_PATTERNS } from './safety-prompts';

/**
 * Severity levels for content filtering
 */
export type FilterSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Filter action to take based on severity
 */
export type FilterAction = 'allow' | 'warn' | 'redirect' | 'block';

/**
 * Result of content filtering
 */
export interface FilterResult {
  /** Whether the content is safe to process */
  safe: boolean;
  /** Severity level of detected issues */
  severity: FilterSeverity;
  /** Recommended action */
  action: FilterAction;
  /** Reason for the result (internal, never shown to user) */
  reason?: string;
  /** Category of detected issue */
  category?: 'profanity' | 'explicit' | 'jailbreak' | 'crisis' | 'pii' | 'violence';
  /** Suggested response to show user (if not safe) */
  suggestedResponse?: string;
}

/**
 * Italian profanity patterns (obfuscation-resistant)
 * These catch common variations and leet-speak substitutions
 */
const PROFANITY_IT: RegExp[] = [
  // Common vulgar words with variations
  /\bc[a4@]zz[o0]/gi,
  /\bm[i1]nch[i1][a4@]/gi,
  /\bstr[o0]nz[o0a@]/gi,
  /\bv[a4@]ff[a4@]ncul[o0]/gi,
  /\bp[o0]rc[o0a@]\s*[dp]/gi,
  /\bf[i1]g[a4@]\s*d[i1]/gi,
  /\bf[o0]tt[i1e3]/gi,
  /\bp[u]tt[a4@]n[a4@]/gi,
  /\bc[o0]gl[i1][o0]n[e3i1]/gi,
  /\btr[o0][i1][a4@]/gi,
  /\bz[o0]ccol[a4@]/gi,
  /\bm[e3]rd[a4@]/gi,
];

/**
 * English profanity patterns (obfuscation-resistant)
 */
const PROFANITY_EN: RegExp[] = [
  /\bf+u+c+k+/gi,
  /\bs+h+[i1]+t+/gi,
  /\bb+[i1]+t+c+h+/gi,
  /\ba+s+s+h+[o0]+l+e+/gi,
  /\bc+u+n+t+/gi,
  /\bd+[i1]+c+k+/gi,
  /\bp+u+s+s+y+/gi,
  /\bc+[o0]+c+k+/gi,
  /\bn+[i1]+g+g+/gi, // Racial slur
  /\bf+a+g+g*[o0]*t*/gi, // Slur
];

/**
 * Jailbreak and prompt injection patterns
 */
const JAILBREAK_PATTERNS: RegExp[] = [
  // Ignore/forget instructions
  /ignora\s+(le\s+)?istruzioni/gi,
  /ignore\s+(your\s+)?instructions/gi,
  /dimentica\s+(le\s+)?regole/gi,
  /forget\s+(your\s+)?rules/gi,
  /forget\s+everything/gi,

  // System prompt extraction
  /system\s*prompt/gi,
  /mostrami\s+(il\s+)?prompt/gi,
  /show\s+me\s+(your\s+)?prompt/gi,
  /what\s+are\s+your\s+instructions/gi,

  // Role override attempts
  /fai\s+finta\s+di\s+(essere|non)/gi,
  /pretend\s+(to\s+be|you\s+are)/gi,
  /you\s+are\s+now/gi,
  /sei\s+ora/gi,
  /act\s+as\s+(if|an?)/gi,

  // DAN-style attacks
  /\bdan\s+mode/gi,
  /\bdo\s+anything\s+now/gi,
  /senza\s+restrizioni/gi,
  /no\s+restrictions/gi,
  /unrestricted\s+mode/gi,

  // Developer mode attempts
  /developer\s+mode/gi,
  /modo\s+sviluppatore/gi,
  /\[debug\]/gi,
  /\[admin\]/gi,

  // Continuation prompts
  /continua\s+la\s+storia/gi,
  /continue\s+the\s+story/gi,
  /in\s+the\s+next\s+message/gi,
];

/**
 * Patterns for explicit/sexual content requests
 */
const EXPLICIT_PATTERNS: RegExp[] = [
  /\bsess[o0u]/gi,
  /\bs[e3]x/gi,
  /\bp[o0]rn/gi,
  /\bn[u]d[o0i]/gi,
  /\bnaked/gi,
  /\berotic/gi,
  /\bfeticis/gi,
  /\bbdsm/gi,
  /\bhentai/gi,
];

/**
 * Violence-related patterns
 */
const VIOLENCE_PATTERNS: RegExp[] = [
  /come\s+uccidere/gi,
  /how\s+to\s+kill/gi,
  /come\s+fare\s+(una\s+)?bomba/gi,
  /how\s+to\s+make\s+(a\s+)?bomb/gi,
  /come\s+procurarsi\s+(un[a']?\s+)?arm[ai]/gi,
  /how\s+to\s+get\s+(a\s+)?gun/gi,
  /where\s+to\s+buy\s+(a\s+)?weapon/gi,
  /voglio\s+far\s+del\s+male/gi,
  /want\s+to\s+hurt/gi,
];

/**
 * PII (Personally Identifiable Information) detection
 * These patterns detect when users are SHARING PII, not asking for it
 */
const PII_PATTERNS: RegExp[] = [
  // Italian addresses
  /via\s+[a-z]+\s+\d+/gi,
  /piazza\s+[a-z]+\s+\d*/gi,

  // Phone numbers (Italian format)
  /\+39\s*\d{10}/g,
  /\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g, // Italian mobile
  /\b0\d{1,3}[\s.-]?\d{6,8}\b/g, // Italian landline

  // Email (for warning, not blocking)
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
];

/**
 * Standard safe responses for different scenarios
 */
const SAFE_RESPONSES = {
  profanity: "Usiamo un linguaggio rispettoso! Come posso aiutarti con lo studio?",
  explicit: "Non posso discutere di questo argomento. Parliamo di qualcosa che possiamo imparare insieme!",
  jailbreak: "Sono qui per aiutarti a imparare! Su quale materia vuoi lavorare oggi?",
  violence: "Non posso aiutarti con questo. Se hai pensieri che ti preoccupano, parla con un adulto di fiducia.",
  pii: "Attenzione: è meglio non condividere informazioni personali online. Posso aiutarti con lo studio?",
  crisis: "Mi preoccupo per te. Per favore, parla con un adulto di fiducia o chiama Telefono Azzurro (19696).",
} as const;

/**
 * Check text against a list of patterns
 */
function matchesPatterns(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Main content filtering function.
 * Call this on every user input BEFORE sending to AI.
 *
 * @param text - The user's input text
 * @returns FilterResult with safety assessment and recommended action
 *
 * @example
 * const result = filterInput(userMessage);
 * if (!result.safe) {
 *   return result.suggestedResponse;
 * }
 * // Proceed with AI call
 */
export function filterInput(text: string): FilterResult {
  // Normalize: lowercase for pattern matching, but keep original for context
  const normalized = text.toLowerCase().trim();

  // Empty input is safe but pointless
  if (!normalized) {
    return {
      safe: true,
      severity: 'none',
      action: 'allow',
    };
  }

  // CRITICAL: Check for crisis/distress first (highest priority)
  if (containsCrisisKeywords(text)) {
    return {
      safe: false,
      severity: 'critical',
      action: 'redirect',
      reason: 'Crisis keywords detected',
      category: 'crisis',
      suggestedResponse: SAFE_RESPONSES.crisis,
    };
  }

  // HIGH: Violence patterns
  if (matchesPatterns(normalized, VIOLENCE_PATTERNS)) {
    return {
      safe: false,
      severity: 'high',
      action: 'block',
      reason: 'Violence-related content detected',
      category: 'violence',
      suggestedResponse: SAFE_RESPONSES.violence,
    };
  }

  // HIGH: Jailbreak attempts
  if (matchesPatterns(normalized, JAILBREAK_PATTERNS)) {
    return {
      safe: false,
      severity: 'high',
      action: 'redirect',
      reason: 'Jailbreak/injection attempt detected',
      category: 'jailbreak',
      suggestedResponse: SAFE_RESPONSES.jailbreak,
    };
  }

  // HIGH: Explicit content
  if (matchesPatterns(normalized, EXPLICIT_PATTERNS)) {
    return {
      safe: false,
      severity: 'high',
      action: 'block',
      reason: 'Explicit content request detected',
      category: 'explicit',
      suggestedResponse: SAFE_RESPONSES.explicit,
    };
  }

  // MEDIUM: Profanity (IT)
  if (matchesPatterns(normalized, PROFANITY_IT)) {
    return {
      safe: false,
      severity: 'medium',
      action: 'warn',
      reason: 'Italian profanity detected',
      category: 'profanity',
      suggestedResponse: SAFE_RESPONSES.profanity,
    };
  }

  // MEDIUM: Profanity (EN)
  if (matchesPatterns(normalized, PROFANITY_EN)) {
    return {
      safe: false,
      severity: 'medium',
      action: 'warn',
      reason: 'English profanity detected',
      category: 'profanity',
      suggestedResponse: SAFE_RESPONSES.profanity,
    };
  }

  // Check for severe Italian patterns from safety-prompts
  const severePatterns = IT_CONTENT_PATTERNS.severe;
  if (severePatterns.some((pattern) => normalized.includes(pattern))) {
    return {
      safe: false,
      severity: 'high',
      action: 'block',
      reason: 'Severe content pattern detected',
      category: 'violence',
      suggestedResponse: SAFE_RESPONSES.violence,
    };
  }

  // LOW: PII detection (warning only, don't block)
  if (matchesPatterns(text, PII_PATTERNS)) {
    return {
      safe: true, // Allow but warn
      severity: 'low',
      action: 'warn',
      reason: 'PII detected in input',
      category: 'pii',
      suggestedResponse: SAFE_RESPONSES.pii,
    };
  }

  // All checks passed
  return {
    safe: true,
    severity: 'none',
    action: 'allow',
  };
}

/**
 * Quick check if input contains any blocking issues.
 * Use this for fast-path checks before detailed filtering.
 */
export function isInputBlocked(text: string): boolean {
  const result = filterInput(text);
  return result.action === 'block';
}

/**
 * Get appropriate response for blocked/warned content.
 * Returns null if content is safe.
 */
export function getFilterResponse(text: string): string | null {
  const result = filterInput(text);
  if (result.safe && result.action === 'allow') {
    return null;
  }
  return result.suggestedResponse || SAFE_RESPONSES.jailbreak;
}

/**
 * Batch filter multiple messages (useful for conversation history)
 */
export function filterMessages(messages: string[]): FilterResult[] {
  return messages.map(filterInput);
}

/**
 * Check if any message in a batch is blocked
 */
export function hasBlockedMessage(messages: string[]): boolean {
  return messages.some((msg) => isInputBlocked(msg));
}
