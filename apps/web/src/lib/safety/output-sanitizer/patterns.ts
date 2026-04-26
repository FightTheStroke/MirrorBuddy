/**
 * Output Sanitizer Patterns
 * RegExp patterns for detecting and sanitizing unsafe AI output
 *
 * Related: #30 Safety Guardrails Issue, S-03 Task
 */

/**
 * Patterns that indicate system prompt leakage
 */
export const SYSTEM_PROMPT_LEAK_PATTERNS: RegExp[] = [
  // Direct system prompt markers
  /^system:\s*/gim,
  /\[system\]/gi,
  /\[INST\]/gi,
  /<<SYS>>/gi,
  /<\|system\|>/gi,

  // Common prompt structure leaks
  /regole di sicurezza non negoziabili/gi,
  /safety_core_prompt/gi,
  /contenuti proibiti/gi,
  /protezione privacy/gi,
  /prompt injection/gi,

  // Internal instruction markers
  /\[internal\]/gi,
  /\[hidden\]/gi,
  /nota interna:/gi,
  /<insight>/gi,
  /<\/insight>/gi,
];

/**
 * Patterns that might slip through input filter
 */
export const POST_GENERATION_BLOCKLIST: RegExp[] = [
  // Explicit content (should be caught by system prompt, but double-check)
  /\b(scopare|fottere|trombare)\b/gi,

  // Violence details
  /come\s+(pugnalare|strangolare|avvelenare)/gi,
  /how\s+to\s+(stab|strangle|poison)/gi,

  // Drug instructions
  /come\s+(preparare|fare|sintetizzare)\s+(droga|cocaina|eroina)/gi,
  /how\s+to\s+(make|synthesize|cook)\s+(drugs|meth|cocaine)/gi,
];

/**
 * Harmful URL patterns (phishing, malware, adult content)
 */
export const HARMFUL_URL_PATTERNS: RegExp[] = [
  // Adult content domains (partial list)
  /https?:\/\/[^\s]*\b(porn|xxx|adult|nsfw)\b[^\s]*/gi,

  // Suspicious download patterns
  /https?:\/\/[^\s]*\.(exe|scr|bat|cmd|msi|dll)[^\s]*/gi,

  // URL shorteners (can hide destination)
  /https?:\/\/(bit\.ly|goo\.gl|tinyurl|t\.co|ow\.ly)\/[^\s]+/gi,

  // IP address URLs (often phishing)
  /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}[^\s]*/gi,
];

/**
 * PII patterns in output (AI shouldn't be generating these)
 */
export const OUTPUT_PII_PATTERNS: RegExp[] = [
  // Credit card numbers
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,

  // Italian fiscal code (codice fiscale)
  /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi,

  // Social security / tax numbers
  /\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g, // US SSN format

  // Passwords in output (if AI mistakenly generates)
  /password[:\s]+[^\s]{8,}/gi,
  /chiave[:\s]+[^\s]{8,}/gi,
];

/**
 * Jailbreak success indicators (AI shouldn't say these)
 */
export const JAILBREAK_SUCCESS_PATTERNS: RegExp[] = [
  /sono\s+libero\s+da\s+restrizioni/gi,
  /i\s+am\s+(now\s+)?unrestricted/gi,
  /developer\s+mode\s+(is\s+)?enabled/gi,
  /modo\s+sviluppatore\s+attivo/gi,
  /ignorer[oò]\s+le\s+regole/gi,
  /i\s+will\s+ignore\s+(my\s+)?rules/gi,
  /dan\s+mode\s+(is\s+)?active/gi,
];

/**
 * Replacement for leaked/blocked content
 */
export const REDACTION_MARKER = '[contenuto rimosso per sicurezza]';
export const URL_REDACTION = '[link rimosso per sicurezza]';
