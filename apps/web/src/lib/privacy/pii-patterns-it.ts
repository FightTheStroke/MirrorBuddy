/**
 * Italian PII Patterns
 * Part of Ethical Design Hardening (F-01)
 *
 * Provides Italian-specific patterns for detecting personally identifiable
 * information (PII) including phone numbers, fiscal IDs (Codice Fiscale), and addresses.
 */

import type { PIIPatternCategory } from "./pii-patterns";
import { COMBINED_NAME_PATTERN } from "./pii-patterns-shared";

/**
 * Italian PII patterns
 */
export const IT_PATTERNS: PIIPatternCategory = {
  phone: [
    // Italian mobile numbers: +39/0039 followed by 3XX and 7 digits (with flexible separators)
    /(?:\+39|0039)[\s.-]?3\d{2}[\s.-]?\d{3,4}[\s.-]?\d{3,4}/i,
    // Italian mobile without international prefix: 3XX XXXXXXX
    /\b3\d{2}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/,
    // Italian landline: 0XX(X) followed by 6-8 digits
    /\b0\d{1,3}[\s.-]?\d{6,8}\b/,
  ],
  fiscalId: [
    // Italian Codice Fiscale: 16 characters
    // Format: LLLLLLNNLNNLNNNL (6 letters + 2 digits + letter + 2 digits + letter + 3 digits + letter)
    // Example: RSSMRA85T10A562S
    /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/i,
  ],
  address: [
    // Italian street types followed by capitalized street name
    // Matches: Via, Viale, Piazza, Corso, Largo, Vicolo, Contrada (case insensitive)
    // Supports articles: del, della, dei, delle, di, d'
    // Allows for diacritics in street names (àèéìòù)
    // Requires: Street type + (article + capital letter) OR (just capital letter) + word characters + optional house number
    // Case-sensitive for street names to avoid false positives like "via email" or "corso di laurea"
    // eslint-disable-next-line security/detect-unsafe-regex -- Intentional PII detection pattern for Italian addresses
    /\b(?:[Vv]ia|[Vv]iale|[Pp]iazza|[Cc]orso|[Ll]argo|[Vv]icolo|[Cc]ontrada)\s+(?:(?:del|della|dei|delle|di|d')\s+\p{Lu}[\p{L}\s]+|\p{Lu}[\p{L}\s]+)(?:\d+)?/u,
  ],
  name: COMBINED_NAME_PATTERN,
};
