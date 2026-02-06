/**
 * Italian PII Patterns
 * Part of Ethical Design Hardening (F-01)
 *
 * Provides Italian-specific patterns for detecting personally identifiable
 * information (PII) including phone numbers, fiscal IDs (Codice Fiscale), and addresses.
 */

import { PIIPatternCategory, COMBINED_NAME_PATTERN } from "./pii-patterns";

/**
 * Italian PII patterns
 */
export const IT_PATTERNS: PIIPatternCategory = {
  phone: [
    // Italian mobile numbers: +39/0039 followed by 3XX and 7 digits
    /(?:\+39|0039)[\s.-]?3\d{2}[\s.-]?\d{6,7}/gi,
    // Italian mobile without international prefix: 3XX XXXXXXX
    /\b3\d{2}[\s.-]?\d{6,7}\b/g,
    // Italian landline: 0XX(X) followed by 6-8 digits
    /\b0\d{1,3}[\s.-]?\d{6,8}\b/g,
  ],
  fiscalId: [
    // Italian Codice Fiscale: 16 characters
    // Format: LLLLLLNNLNNLNNNL (6 letters + 2 digits + letter + 2 digits + letter + 3 digits + letter)
    // Example: RSSMRA85T10A562S
    /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi,
  ],
  address: [
    // Italian street types followed by capitalized street name
    // Matches: Via, Viale, Piazza, Corso, Largo, Vicolo, Contrada
    // Supports articles: del, della, dei, delle, di, d'
    // Allows for diacritics in street names (àèéìòù)
    // eslint-disable-next-line security/detect-unsafe-regex -- Intentional PII detection pattern for Italian addresses
    /\b(?:Via|Viale|Piazza|Corso|Largo|Vicolo|Contrada)\s+(?:del|della|dei|delle|di|d'|[A-Z])[\p{L}\s]+(?:\d+)?/giu,
  ],
  name: COMBINED_NAME_PATTERN,
};
