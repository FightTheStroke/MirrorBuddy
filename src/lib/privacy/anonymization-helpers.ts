/**
 * Anonymization Helpers
 * Part of Ethical Design Hardening (F-01)
 *
 * Pattern constants and utility functions for PII detection and replacement.
 * Extracted from anonymization-service.ts for better modularity.
 */

import { createHash, randomBytes } from "crypto";
import { PIIType } from "./types";
import { getCombinedPatterns } from "./pii-patterns";

// Get combined patterns from all locales
const PII_PATTERNS = getCombinedPatterns();

// Email pattern - not locale-specific
export const EMAIL_PATTERN =
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i;

// Date pattern - various formats
export const DATE_PATTERN =
  /\b(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/;

// Generic numeric IDs (6+ digits)
export const GENERIC_ID_PATTERN = /\b[A-Z]{0,3}[0-9]{6,}\b/;

// Placeholder templates
export const PLACEHOLDERS: Record<PIIType, string> = {
  name: "[NOME]",
  email: "[EMAIL]",
  phone: "[TELEFONO]",
  date: "[DATA]",
  id: "[ID]",
  address: "[INDIRIZZO]",
  custom: "[REDACTED]",
};

/**
 * Test content against an array of patterns
 */
export function testPatterns(content: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(content));
}

/**
 * Replace content using an array of patterns
 */
export function replaceWithPatterns(
  content: string,
  patterns: RegExp[],
  placeholder: string,
): { result: string; count: number } {
  let result = content;
  let count = 0;

  for (const pattern of patterns) {
    // Create a global variant for matching and replacing
    const flags = pattern.flags.includes("g")
      ? pattern.flags
      : pattern.flags + "g";
    // eslint-disable-next-line security/detect-non-literal-regexp
    const globalPattern = new RegExp(pattern.source, flags);
    const matches = result.match(globalPattern) || [];
    count += matches.length;
    result = result.replace(globalPattern, placeholder);
  }

  return { result, count };
}

/**
 * Escape special regex characters
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generate a deterministic pseudonym from an original value
 * Same input always produces same output (for consistency)
 */
export function generatePseudonym(
  original: string,
  salt: string = "mirrorbuddy",
): string {
  const hash = createHash("sha256")
    .update(original + salt)
    .digest("hex");
  return `PSE_${hash.slice(0, 12)}`;
}

/**
 * Generate a random pseudonym (non-deterministic)
 */
export function generateRandomPseudonym(prefix: string = "USR"): string {
  const random = randomBytes(6).toString("hex");
  return `${prefix}_${random}`;
}

/**
 * Anonymize user ID for logging/analytics
 * More aggressive than the existing anonymizeId in monitoring/utils.ts
 */
export function anonymizeUserId(userId: string): string {
  if (!userId || userId.length < 4) return "***";
  return generatePseudonym(userId).slice(0, 16);
}

/**
 * Detect PII types present in content
 */
export function detectPII(content: string): PIIType[] {
  const found: PIIType[] = [];

  // Test name pattern
  if (PII_PATTERNS.name.test(content)) found.push("name");

  // Test email pattern
  if (EMAIL_PATTERN.test(content)) found.push("email");

  // Test phone patterns (array)
  if (testPatterns(content, PII_PATTERNS.phone)) found.push("phone");

  // Test date pattern
  if (DATE_PATTERN.test(content)) found.push("date");

  // Test fiscal ID patterns (array)
  if (testPatterns(content, PII_PATTERNS.fiscalId)) found.push("id");

  // Test generic ID pattern
  if (GENERIC_ID_PATTERN.test(content)) found.push("id");

  // Test address patterns (array)
  if (testPatterns(content, PII_PATTERNS.address)) found.push("address");

  return found;
}
