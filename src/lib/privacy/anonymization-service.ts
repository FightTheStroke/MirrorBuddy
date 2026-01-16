/**
 * Anonymization Service
 * Part of Ethical Design Hardening (F-01)
 *
 * Provides PII detection and anonymization for conversation data,
 * supporting GDPR compliance and privacy-by-design principles.
 */

import { createHash, randomBytes } from 'crypto';
import {
  AnonymizationOptions,
  ContentAnonymizationResult,
  DEFAULT_ANONYMIZATION_OPTIONS,
  PIIType,
  PseudonymizationResult,
} from './types';

// PII Detection Patterns
const PII_PATTERNS = {
  // Italian and international name patterns
  name: /\b[A-Z][a-zàèéìòù]+(?:\s+[A-Z][a-zàèéìòù]+)+\b/g,

  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,

  // Phone numbers (Italian and international)
  phone:
    /\b(?:\+39\s?)?(?:0[0-9]{1,4}[-\s]?)?[0-9]{6,10}\b|\b\+?[0-9]{1,4}[-.\s]?[0-9]{2,4}[-.\s]?[0-9]{4,}\b/g,

  // Dates (various formats)
  date: /\b(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/g,

  // Numeric IDs (6+ digits)
  id: /\b[A-Z]{0,3}[0-9]{6,}\b/g,

  // Italian fiscal code (Codice Fiscale)
  fiscalCode: /\b[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]\b/gi,

  // Italian addresses
  address:
    /\b(?:via|viale|piazza|corso|largo)\s+[A-Za-zàèéìòù\s]+,?\s*\d+\b/gi,
};

// Placeholder templates
const PLACEHOLDERS: Record<PIIType, string> = {
  name: '[NOME]',
  email: '[EMAIL]',
  phone: '[TELEFONO]',
  date: '[DATA]',
  id: '[ID]',
  address: '[INDIRIZZO]',
  custom: '[REDACTED]',
};

/**
 * Generate a deterministic pseudonym from an original value
 * Same input always produces same output (for consistency)
 */
export function generatePseudonym(
  original: string,
  salt: string = 'mirrorbuddy'
): string {
  const hash = createHash('sha256')
    .update(original + salt)
    .digest('hex');
  return `PSE_${hash.slice(0, 12)}`;
}

/**
 * Generate a random pseudonym (non-deterministic)
 */
export function generateRandomPseudonym(prefix: string = 'USR'): string {
  const random = randomBytes(6).toString('hex');
  return `${prefix}_${random}`;
}

/**
 * Anonymize user ID for logging/analytics
 * More aggressive than the existing anonymizeId in monitoring/utils.ts
 */
export function anonymizeUserId(userId: string): string {
  if (!userId || userId.length < 4) return '***';
  return generatePseudonym(userId).slice(0, 16);
}

/**
 * Detect PII types present in content
 */
export function detectPII(content: string): PIIType[] {
  const found: PIIType[] = [];

  if (PII_PATTERNS.name.test(content)) found.push('name');
  if (PII_PATTERNS.email.test(content)) found.push('email');
  if (PII_PATTERNS.phone.test(content)) found.push('phone');
  if (PII_PATTERNS.date.test(content)) found.push('date');
  if (PII_PATTERNS.id.test(content)) found.push('id');
  if (PII_PATTERNS.fiscalCode.test(content)) found.push('id');
  if (PII_PATTERNS.address.test(content)) found.push('address');

  // Reset regex lastIndex (global flag side effect)
  Object.values(PII_PATTERNS).forEach((pattern) => (pattern.lastIndex = 0));

  return found;
}

/**
 * Anonymize content by replacing PII with placeholders
 */
export function anonymizeContent(
  content: string,
  options: Partial<AnonymizationOptions> = {}
): ContentAnonymizationResult {
  const opts = { ...DEFAULT_ANONYMIZATION_OPTIONS, ...options };
  let result = content;
  const piiTypesFound: PIIType[] = [];
  let totalReplacements = 0;

  // Process each PII type
  if (opts.anonymizeNames) {
    const matches = result.match(PII_PATTERNS.name) || [];
    if (matches.length > 0) {
      piiTypesFound.push('name');
      totalReplacements += matches.length;
      result = result.replace(PII_PATTERNS.name, PLACEHOLDERS.name);
    }
  }

  if (opts.anonymizeEmails) {
    const matches = result.match(PII_PATTERNS.email) || [];
    if (matches.length > 0) {
      piiTypesFound.push('email');
      totalReplacements += matches.length;
      result = result.replace(PII_PATTERNS.email, PLACEHOLDERS.email);
    }
  }

  if (opts.anonymizePhones) {
    const matches = result.match(PII_PATTERNS.phone) || [];
    if (matches.length > 0) {
      piiTypesFound.push('phone');
      totalReplacements += matches.length;
      result = result.replace(PII_PATTERNS.phone, PLACEHOLDERS.phone);
    }
  }

  if (opts.anonymizeDates) {
    const matches = result.match(PII_PATTERNS.date) || [];
    if (matches.length > 0) {
      piiTypesFound.push('date');
      totalReplacements += matches.length;
      result = result.replace(PII_PATTERNS.date, PLACEHOLDERS.date);
    }
  }

  if (opts.anonymizeIds) {
    // Fiscal code first (more specific)
    const fiscalMatches = result.match(PII_PATTERNS.fiscalCode) || [];
    if (fiscalMatches.length > 0) {
      piiTypesFound.push('id');
      totalReplacements += fiscalMatches.length;
      result = result.replace(PII_PATTERNS.fiscalCode, PLACEHOLDERS.id);
    }

    // Generic IDs
    const idMatches = result.match(PII_PATTERNS.id) || [];
    if (idMatches.length > 0) {
      if (!piiTypesFound.includes('id')) piiTypesFound.push('id');
      totalReplacements += idMatches.length;
      result = result.replace(PII_PATTERNS.id, PLACEHOLDERS.id);
    }
  }

  // Always anonymize addresses
  const addressMatches = result.match(PII_PATTERNS.address) || [];
  if (addressMatches.length > 0) {
    piiTypesFound.push('address');
    totalReplacements += addressMatches.length;
    result = result.replace(PII_PATTERNS.address, PLACEHOLDERS.address);
  }

  // Custom patterns
  if (opts.customPatterns) {
    for (const pattern of opts.customPatterns) {
      const matches = result.match(pattern) || [];
      if (matches.length > 0) {
        if (!piiTypesFound.includes('custom')) piiTypesFound.push('custom');
        totalReplacements += matches.length;
        result = result.replace(pattern, PLACEHOLDERS.custom);
      }
    }
  }

  // Reset all regex lastIndex
  Object.values(PII_PATTERNS).forEach((pattern) => (pattern.lastIndex = 0));

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
  salt?: string
): PseudonymizationResult {
  const mapping = new Map<string, string>();
  let result = content;
  let replacementCount = 0;

  // Find all PII and create pseudonyms
  const allPatterns = [
    PII_PATTERNS.email,
    PII_PATTERNS.name,
    PII_PATTERNS.phone,
    PII_PATTERNS.fiscalCode,
  ];

  for (const pattern of allPatterns) {
    const matches = content.match(pattern) || [];
    for (const match of matches) {
      if (!mapping.has(match)) {
        const pseudonym = generatePseudonym(match, salt);
        mapping.set(match, pseudonym);
      }
      result = result.replace(new RegExp(escapeRegex(match), 'g'), mapping.get(match)!);
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
  options?: Partial<AnonymizationOptions>
): string {
  return anonymizeContent(message, options).content;
}

/**
 * Check if content contains sensitive PII that requires anonymization
 */
export function containsSensitivePII(content: string): boolean {
  const piiTypes = detectPII(content);
  // Name + email/phone/fiscal code is high risk
  const highRiskTypes: PIIType[] = ['email', 'phone', 'address'];
  return (
    piiTypes.includes('name') &&
    piiTypes.some((t) => highRiskTypes.includes(t))
  );
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
