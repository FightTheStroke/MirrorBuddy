/**
 * Spanish PII Patterns
 * Part of Ethical Design Hardening (F-01)
 *
 * Provides Spanish-specific patterns for detecting personally identifiable
 * information (PII) including phone numbers, fiscal IDs (DNI, NIE), and addresses.
 */

import type { PIIPatternCategory } from "./pii-patterns";
import { COMBINED_NAME_PATTERN } from "./pii-patterns-shared";

/**
 * Spanish PII patterns
 */
export const ES_PATTERNS: PIIPatternCategory = {
  phone: [
    // Spanish mobile numbers: 6XX XXX XXX or 7XX XXX XXX
    /\b[67]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/,
    // Spanish landline numbers: 8XX XXX XXX or 9XX XXX XXX
    /\b[89]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/,
    // International format: +34 followed by 9 digits
    /\+34[\s.-]?[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/,
  ],
  fiscalId: [
    // Spanish DNI: 8 digits + 1 letter (with optional hyphen or space)
    // Example: 12345678Z, 12345678-Z, 12345678 Z
    /\b\d{8}[-\s]?[A-Z]\b/i,
    // Spanish NIE: X/Y/Z + 7 digits + 1 letter (with optional hyphen or space)
    // Example: X1234567L, Y1234567-Z, Z1234567 A
    /\b[XYZ]\d{7}[-\s]?[A-Z]\b/i,
  ],
  address: [
    // Spanish street types with optional number and name
    // Full forms: Calle, Avenida, Paseo, Plaza, Camino, Carretera
    // Abbreviated forms: C/, Avda., Pza.
    // Supports articles: de la, del, de los, de las
    // eslint-disable-next-line security/detect-unsafe-regex -- Intentional PII detection pattern for Spanish addresses
    /\b(?:[Cc]alle|[Cc]\/|[Aa]venida|[Aa]vda\.|[Pp]aseo|[Pp]laza|[Pp]za\.|[Cc]amino|[Cc]arretera)\s+(?:de\s+(?:la|los|las)\s+|del\s+)?[\p{L}\s'-]+(?:\d+)?/iu,
  ],
  name: COMBINED_NAME_PATTERN,
};
