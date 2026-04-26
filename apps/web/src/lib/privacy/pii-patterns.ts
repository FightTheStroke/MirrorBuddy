/**
 * Multi-Locale PII Pattern Registry
 * Part of Ethical Design Hardening (F-01)
 *
 * Provides locale-specific patterns for detecting personally identifiable
 * information (PII) including phone numbers, fiscal IDs, addresses, and names.
 *
 * Supports: Italian (it), English (en), French (fr), German (de), Spanish (es)
 */

import { IT_PATTERNS } from "./pii-patterns-it";
import { EN_PATTERNS } from "./pii-patterns-en";
import { FR_PATTERNS } from "./pii-patterns-fr";
import { DE_PATTERNS } from "./pii-patterns-de";
import { ES_PATTERNS } from "./pii-patterns-es";
import { COMBINED_NAME_PATTERN } from "./pii-patterns-shared";

/**
 * Supported locale codes
 */
export type SupportedLocale = "it" | "en" | "fr" | "de" | "es";

/**
 * PII Pattern Category
 * Contains patterns for different types of PII specific to a locale
 */
export interface PIIPatternCategory {
  /** Phone number patterns */
  phone: RegExp[];
  /** Fiscal/Tax ID patterns (e.g., Italian Codice Fiscale, SSN, etc.) */
  fiscalId: RegExp[];
  /** Address patterns (street names, postal codes) */
  address: RegExp[];
  /** Name pattern (shared across locales with Unicode support) */
  name: RegExp;
}

/**
 * Locale-keyed registry of PII patterns
 */
export type LocalePIIPatterns = Record<SupportedLocale, PIIPatternCategory>;

// Re-export COMBINED_NAME_PATTERN for public API
export { COMBINED_NAME_PATTERN };

/**
 * PII Pattern Registry
 * Assembled from locale-specific pattern files
 */
export const PII_LOCALE_REGISTRY: LocalePIIPatterns = {
  it: IT_PATTERNS,
  en: EN_PATTERNS,
  fr: FR_PATTERNS,
  de: DE_PATTERNS,
  es: ES_PATTERNS,
};

/**
 * Get PII patterns for a specific locale
 *
 * @param locale - The locale code (it, en, fr, de, es)
 * @returns PIIPatternCategory for the requested locale
 */
export function getLocalePatterns(locale: SupportedLocale): PIIPatternCategory {
  return PII_LOCALE_REGISTRY[locale];
}

/**
 * Get combined patterns from all locales
 *
 * Merges patterns from all supported locales into a single category.
 * Useful for processing content when locale is unknown or mixed.
 *
 * @returns Combined PIIPatternCategory with patterns from all locales
 */
export function getCombinedPatterns(): PIIPatternCategory {
  const combined: PIIPatternCategory = {
    phone: [],
    fiscalId: [],
    address: [],
    name: COMBINED_NAME_PATTERN,
  };

  // Merge patterns from all locales
  const locales: SupportedLocale[] = ["it", "en", "fr", "de", "es"];

  for (const locale of locales) {
    const patterns = PII_LOCALE_REGISTRY[locale];
    combined.phone.push(...patterns.phone);
    combined.fiscalId.push(...patterns.fiscalId);
    combined.address.push(...patterns.address);
  }

  return combined;
}
