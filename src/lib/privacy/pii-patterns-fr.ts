/**
 * French PII Patterns
 * Part of Ethical Design Hardening (F-01)
 *
 * Provides French-specific patterns for detecting personally identifiable
 * information (PII) including phone numbers, fiscal IDs (NIR), and addresses.
 */

import { PIIPatternCategory, COMBINED_NAME_PATTERN } from "./pii-patterns";

/**
 * French PII patterns
 */
export const FR_PATTERNS: PIIPatternCategory = {
  phone: [
    // French mobile numbers: 06 XX XX XX XX or 07 XX XX XX XX
    /\b0[67][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/g,
    // French landline numbers: 01-05 followed by 8 digits
    /\b0[1-5][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/g,
    // International format: +33 followed by 9 digits (dropping leading 0)
    /\+33[\s.-]?[1-7][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/g,
  ],
  fiscalId: [
    // French NIR (Numéro de Sécurité Sociale): 15 digits
    // Format: [1-4] YY MM DD XXX XXX XX
    // Sex code (1=male, 2=female, 3/4=special) + year + month + location + sequence + key
    /\b[1-4][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{2}\b/g,
  ],
  address: [
    // French street types with optional number and name
    // rue, avenue, boulevard, place, chemin, allée, impasse
    // eslint-disable-next-line security/detect-unsafe-regex -- Intentional PII detection pattern for French addresses
    /\b\d*\s*(?:[Rr]ue|[Aa]venue|[Bb]oulevard|[Bb]lvd|[Pp]lace|[Cc]hemin|[Aa]llée|[Ii]mpasse)\s+(?:de\s+(?:la|l'|le|les)\s+)?(?:du\s+|des\s+)?[\p{L}\s'-]+/gu,
    // French postal codes: 5 digits
    /\b\d{5}\b/g,
  ],
  name: COMBINED_NAME_PATTERN,
};
