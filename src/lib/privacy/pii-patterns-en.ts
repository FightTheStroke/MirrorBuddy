/**
 * English PII Patterns
 * Part of Ethical Design Hardening (F-01)
 *
 * Provides English-specific patterns for detecting personally identifiable
 * information (PII) including phone numbers, fiscal IDs (NIN, SSN), and addresses.
 * Supports UK and US formats.
 */

import type { PIIPatternCategory } from "./pii-patterns";
import { COMBINED_NAME_PATTERN } from "./pii-patterns-shared";

/**
 * English PII patterns (UK and US)
 */
export const EN_PATTERNS: PIIPatternCategory = {
  phone: [
    // UK phone numbers: +44 followed by various formats
    // Matches: +44 20 1234 5678, +44 7700 900123, +447700900123
    /\+44[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/,
    // US/Canadian phone numbers: +1 followed by 10 digits
    // Matches: +1 555 123 4567, +15551234567, +1-555-123-4567
    /\+1[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/,
    // US phone numbers with parentheses: (555) 123-4567
    /\(\d{3}\)[\s.-]?\d{3}[\s.-]?\d{4}\b/,
    // US phone numbers simple formats: 555-123-4567, 555.123.4567, 555 123 4567
    /\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/,
    // US phone numbers without separators: 5551234567 (10 digits)
    /\b\d{10}\b/,
  ],
  fiscalId: [
    // UK National Insurance Number (NIN): AB 12 34 56 C
    // Format: 2 letters + 6 digits + 1 letter (with optional spaces/hyphens)
    // Example: AB123456C, AB 12 34 56 C, AB-12-34-56-C
    /\b[A-Z]{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?[A-Z]\b/i,
    // US Social Security Number (SSN): 123-45-6789
    // Format: 3 digits + 2 digits + 4 digits (with optional hyphens/spaces)
    // Matches: 123-45-6789, 123 45 6789, 123456789
    // Negative lookbehind to exclude product codes like "SKU-123456789"
    /(?<![A-Z]-)\b\d{3}[\s.-]?\d{2}[\s.-]?\d{4}\b/,
  ],
  address: [
    // English street addresses with full street type names
    // Matches: 123 Main Street, Baker Street, Broadway, High Street
    // Supports optional number prefix and single or multiple word street names
    // eslint-disable-next-line security/detect-unsafe-regex -- Intentional PII detection pattern for English addresses
    /\b(?:\d+\s+)?[\p{L}][\p{L}\s-]*(?:Street|Road|Avenue|Lane|Drive|Boulevard|Way)\b/iu,
    // English street addresses with abbreviated forms
    // Matches: 123 Main St, Oak Rd, Park Ave
    // eslint-disable-next-line security/detect-unsafe-regex -- Intentional PII detection pattern for English addresses
    /\b(?:\d+\s+)?[\p{L}][\p{L}\s-]*\s+(?:St|Rd|Ave|Blvd|Dr|Ln)\b/iu,
    // UK postal codes: SW1A 1AA, EC1A 1BB
    // Format: 1-2 letters + 1-2 digits + optional letter + space + 1 digit + 2 letters
    /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2}\b/i,
    // US ZIP codes: 12345 or 12345-6789 (ZIP+4)
    // eslint-disable-next-line security/detect-unsafe-regex -- Intentional PII detection pattern for US ZIP codes
    /\b\d{5}(?:-\d{4})?\b/,
  ],
  name: COMBINED_NAME_PATTERN,
};
