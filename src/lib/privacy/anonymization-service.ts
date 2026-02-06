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
    PII_PATTERNS.name.lastIndex = 0;
    const matches = result.match(PII_PATTERNS.name) || [];
    if (matches.length > 0) {
      piiTypesFound.push("name");
      totalReplacements += matches.length;
      result = result.replace(PII_PATTERNS.name, PLACEHOLDERS.name);
    }
    PII_PATTERNS.name.lastIndex = 0;
  }

  // Process emails
  if (opts.anonymizeEmails) {
    EMAIL_PATTERN.lastIndex = 0;
    const matches = result.match(EMAIL_PATTERN) || [];
    if (matches.length > 0) {
      piiTypesFound.push("email");
      totalReplacements += matches.length;
      result = result.replace(EMAIL_PATTERN, PLACEHOLDERS.email);
    }
    EMAIL_PATTERN.lastIndex = 0;
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
    DATE_PATTERN.lastIndex = 0;
    const matches = result.match(DATE_PATTERN) || [];
    if (matches.length > 0) {
      piiTypesFound.push("date");
      totalReplacements += matches.length;
      result = result.replace(DATE_PATTERN, PLACEHOLDERS.date);
    }
    DATE_PATTERN.lastIndex = 0;
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
    GENERIC_ID_PATTERN.lastIndex = 0;
    const idMatches = result.match(GENERIC_ID_PATTERN) || [];
    if (idMatches.length > 0) {
      if (!piiTypesFound.includes("id")) piiTypesFound.push("id");
      totalReplacements += idMatches.length;
      result = result.replace(GENERIC_ID_PATTERN, PLACEHOLDERS.id);
    }
    GENERIC_ID_PATTERN.lastIndex = 0;
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
      pattern.lastIndex = 0;
      const matches = result.match(pattern) || [];
      if (matches.length > 0) {
        if (!piiTypesFound.includes("custom")) piiTypesFound.push("custom");
        totalReplacements += matches.length;
        result = result.replace(pattern, PLACEHOLDERS.custom);
      }
      pattern.lastIndex = 0;
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
    pattern.lastIndex = 0;
    const matches = content.match(pattern) || [];
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
    pattern.lastIndex = 0;
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
