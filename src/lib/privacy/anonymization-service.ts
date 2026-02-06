/**
 * Anonymization Service
 * Part of Ethical Design Hardening (F-01)
 *
 * Provides PII detection and anonymization for conversation data,
 * supporting GDPR compliance and privacy-by-design principles.
 */

import {
  AnonymizationOptions,
  ContentAnonymizationResult,
  DEFAULT_ANONYMIZATION_OPTIONS,
  PIIType,
  PseudonymizationResult,
} from "./types";
import { getCombinedPatterns } from "./pii-patterns";
import {
  EMAIL_PATTERN,
  DATE_PATTERN,
  GENERIC_ID_PATTERN,
  PLACEHOLDERS,
  replaceWithPatterns,
  escapeRegex,
  generatePseudonym,
  generateRandomPseudonym,
  anonymizeUserId,
  detectPII,
} from "./anonymization-helpers";

// Get combined patterns from all locales
const PII_PATTERNS = getCombinedPatterns();

// Re-export helper functions for public API
export {
  generatePseudonym,
  generateRandomPseudonym,
  anonymizeUserId,
  detectPII,
};

/**
 * Anonymize content by replacing PII with placeholders
 */
export function anonymizeContent(
  content: string,
  options: Partial<AnonymizationOptions> = {},
): ContentAnonymizationResult {
  const opts = { ...DEFAULT_ANONYMIZATION_OPTIONS, ...options };
  let result = content;
  const piiTypesFound: PIIType[] = [];
  let totalReplacements = 0;

  // Process names
  if (opts.anonymizeNames) {
    // Create global version of name pattern for matching all occurrences
    const globalNamePattern = new RegExp(
      PII_PATTERNS.name.source,
      PII_PATTERNS.name.flags.includes("g")
        ? PII_PATTERNS.name.flags
        : PII_PATTERNS.name.flags + "g",
    );
    const matches = result.match(globalNamePattern) || [];
    if (matches.length > 0) {
      piiTypesFound.push("name");
      totalReplacements += matches.length;
      result = result.replace(globalNamePattern, PLACEHOLDERS.name);
    }
  }

  // Process emails
  if (opts.anonymizeEmails) {
    // Create global version of email pattern
    const globalEmailPattern = new RegExp(
      EMAIL_PATTERN.source,
      EMAIL_PATTERN.flags.includes("g")
        ? EMAIL_PATTERN.flags
        : EMAIL_PATTERN.flags + "g",
    );
    const matches = result.match(globalEmailPattern) || [];
    if (matches.length > 0) {
      piiTypesFound.push("email");
      totalReplacements += matches.length;
      result = result.replace(globalEmailPattern, PLACEHOLDERS.email);
    }
  }

  // Process phones
  if (opts.anonymizePhones) {
    const phoneResult = replaceWithPatterns(
      result,
      PII_PATTERNS.phone,
      PLACEHOLDERS.phone,
    );
    if (phoneResult.count > 0) {
      piiTypesFound.push("phone");
      totalReplacements += phoneResult.count;
      result = phoneResult.result;
    }
  }

  // Process dates
  if (opts.anonymizeDates) {
    // Create global version of date pattern
    const globalDatePattern = new RegExp(
      DATE_PATTERN.source,
      DATE_PATTERN.flags.includes("g")
        ? DATE_PATTERN.flags
        : DATE_PATTERN.flags + "g",
    );
    const matches = result.match(globalDatePattern) || [];
    if (matches.length > 0) {
      piiTypesFound.push("date");
      totalReplacements += matches.length;
      result = result.replace(globalDatePattern, PLACEHOLDERS.date);
    }
  }

  // Process IDs
  if (opts.anonymizeIds) {
    // Fiscal IDs first (more specific)
    const fiscalResult = replaceWithPatterns(
      result,
      PII_PATTERNS.fiscalId,
      PLACEHOLDERS.id,
    );
    if (fiscalResult.count > 0) {
      piiTypesFound.push("id");
      totalReplacements += fiscalResult.count;
      result = fiscalResult.result;
    }

    // Generic IDs
    const globalGenericIdPattern = new RegExp(
      GENERIC_ID_PATTERN.source,
      GENERIC_ID_PATTERN.flags.includes("g")
        ? GENERIC_ID_PATTERN.flags
        : GENERIC_ID_PATTERN.flags + "g",
    );
    const idMatches = result.match(globalGenericIdPattern) || [];
    if (idMatches.length > 0) {
      if (!piiTypesFound.includes("id")) piiTypesFound.push("id");
      totalReplacements += idMatches.length;
      result = result.replace(globalGenericIdPattern, PLACEHOLDERS.id);
    }
  }

  // Always anonymize addresses
  const addressResult = replaceWithPatterns(
    result,
    PII_PATTERNS.address,
    PLACEHOLDERS.address,
  );
  if (addressResult.count > 0) {
    piiTypesFound.push("address");
    totalReplacements += addressResult.count;
    result = addressResult.result;
  }

  // Custom patterns
  if (opts.customPatterns) {
    for (const pattern of opts.customPatterns) {
      // Create global version of custom pattern
      const globalCustomPattern = new RegExp(
        pattern.source,
        pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g",
      );
      const matches = result.match(globalCustomPattern) || [];
      if (matches.length > 0) {
        if (!piiTypesFound.includes("custom")) piiTypesFound.push("custom");
        totalReplacements += matches.length;
        result = result.replace(globalCustomPattern, PLACEHOLDERS.custom);
      }
    }
  }

  return {
    content: result,
    piiTypesFound,
    totalReplacements,
  };
}

/**
 * Pseudonymize content - replace PII with consistent pseudonyms
 * Allows for reversibility if mapping is stored securely
 */
export function pseudonymizeContent(
  content: string,
  salt?: string,
): PseudonymizationResult {
  const mapping = new Map<string, string>();
  let result = content;
  let replacementCount = 0;

  // Collect all patterns to process
  const allPatterns: RegExp[] = [
    EMAIL_PATTERN,
    PII_PATTERNS.name,
    ...PII_PATTERNS.phone,
    ...PII_PATTERNS.fiscalId,
  ];

  for (const pattern of allPatterns) {
    // Create global version of pattern for matching all occurrences
    const globalPattern = new RegExp(
      pattern.source,
      pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g",
    );
    const matches = content.match(globalPattern) || [];
    for (const match of matches) {
      if (!mapping.has(match)) {
        const pseudonym = generatePseudonym(match, salt);
        mapping.set(match, pseudonym);
      }
      result = result.replace(
        new RegExp(escapeRegex(match), "g"),
        mapping.get(match)!,
      );
      replacementCount++;
    }
  }

  return {
    content: result,
    mapping,
    replacementCount,
  };
}

/**
 * Anonymize conversation message for storage/RAG
 */
export function anonymizeConversationMessage(
  message: string,
  options?: Partial<AnonymizationOptions>,
): string {
  return anonymizeContent(message, options).content;
}

/**
 * Check if content contains sensitive PII that requires anonymization
 */
export function containsSensitivePII(content: string): boolean {
  const piiTypes = detectPII(content);
  // Name + email/phone/address is high risk
  const highRiskTypes: PIIType[] = ["email", "phone", "address"];
  return (
    piiTypes.includes("name") && piiTypes.some((t) => highRiskTypes.includes(t))
  );
}
