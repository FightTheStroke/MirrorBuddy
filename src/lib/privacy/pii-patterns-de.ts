/**
 * German PII Patterns
 * Part of Ethical Design Hardening (F-01)
 *
 * Provides German-specific patterns for detecting personally identifiable
 * information (PII) including phone numbers, fiscal IDs (Steuer-IdNr), and addresses.
 */

import type { PIIPatternCategory } from "./pii-patterns";
import { COMBINED_NAME_PATTERN } from "./pii-patterns-shared";

/**
 * German PII patterns
 */
export const DE_PATTERNS: PIIPatternCategory = {
  phone: [
    // German mobile numbers: 015x, 016x, 017x followed by 7-9 digits
    /\b0(?:15|16|17)\d[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/,
    // German landline numbers: area codes 02-09 followed by 6-10 digits
    /\b0[2-9]\d[\s.-]?\d{4,10}\b/,
    // International format: +49 followed by area code and number
    /\+49[\s.-]?(?:15|16|17)\d[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/,
    /\+49[\s.-]?[2-9]\d{1,4}[\s.-]?\d{4,10}\b/,
  ],
  fiscalId: [
    // German Tax ID (Steuer-IdNr): exactly 11 digits
    /\b\d{11}\b/,
  ],
  address: [
    // German street types with optional house numbers
    // Matches: Straße, Str., Platz, Weg, Allee, Gasse
    // eslint-disable-next-line security/detect-unsafe-regex -- Intentional PII detection pattern for German addresses
    /\b[\p{L}\s-]+(?:straße|strasse)(?:\s+\d+[a-z]?)?/iu,
    // eslint-disable-next-line security/detect-unsafe-regex -- Intentional PII detection pattern for German addresses
    /\b[\p{L}\s-]+str\.(?:\s+\d+[a-z]?)?/iu,
    // eslint-disable-next-line security/detect-unsafe-regex -- Intentional PII detection pattern for German addresses
    /\b[\p{L}\s-]+platz(?:\s+\d+[a-z]?)?/iu,
    // eslint-disable-next-line security/detect-unsafe-regex -- Intentional PII detection pattern for German addresses
    /\b[\p{L}\s-]+weg(?:\s+\d+[a-z]?)?/iu,
    // eslint-disable-next-line security/detect-unsafe-regex -- Intentional PII detection pattern for German addresses
    /\b[\p{L}\s-]+allee(?:\s+\d+[a-z]?)?/iu,
    // eslint-disable-next-line security/detect-unsafe-regex -- Intentional PII detection pattern for German addresses
    /\b[\p{L}\s-]+gasse(?:\s+\d+[a-z]?)?/iu,
  ],
  name: COMBINED_NAME_PATTERN,
};
