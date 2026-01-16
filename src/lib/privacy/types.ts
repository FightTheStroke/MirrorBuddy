/**
 * Privacy and Anonymization Types
 * Part of Ethical Design Hardening (F-01)
 */

export interface AnonymizationOptions {
  /** Replace names with placeholders */
  anonymizeNames: boolean;
  /** Replace emails with placeholders */
  anonymizeEmails: boolean;
  /** Replace phone numbers */
  anonymizePhones: boolean;
  /** Replace dates with relative descriptions */
  anonymizeDates: boolean;
  /** Replace numeric IDs */
  anonymizeIds: boolean;
  /** Custom patterns to anonymize */
  customPatterns?: RegExp[];
}

export interface PseudonymizationResult {
  /** The pseudonymized content */
  content: string;
  /** Mapping of original -> pseudonym (for reversibility if needed) */
  mapping: Map<string, string>;
  /** Count of replacements made */
  replacementCount: number;
}

export interface ContentAnonymizationResult {
  /** Anonymized content */
  content: string;
  /** Types of PII found and removed */
  piiTypesFound: PIIType[];
  /** Total replacements made */
  totalReplacements: number;
}

export type PIIType =
  | 'name'
  | 'email'
  | 'phone'
  | 'date'
  | 'id'
  | 'address'
  | 'custom';

export interface DataRetentionPolicy {
  /** Default TTL in days for conversation data */
  conversationTTLDays: number;
  /** TTL for embeddings/vectors */
  embeddingsTTLDays: number;
  /** TTL for learning progress */
  progressTTLDays: number;
  /** TTL for flashcard history */
  flashcardTTLDays: number;
  /** Whether to auto-delete or just mark for deletion */
  autoDelete: boolean;
}

export interface UserPrivacyPreferences {
  userId: string;
  /** Opt-in to pseudonymized learning mode */
  pseudonymizedMode: boolean;
  /** Custom retention policy (overrides default) */
  customRetention?: Partial<DataRetentionPolicy>;
  /** Consent timestamp */
  consentedAt: Date;
  /** Last updated */
  updatedAt: Date;
}

export const DEFAULT_RETENTION_POLICY: DataRetentionPolicy = {
  conversationTTLDays: 365,
  embeddingsTTLDays: 365,
  progressTTLDays: 730, // 2 years for learning progress
  flashcardTTLDays: 730,
  autoDelete: false,
};

export const DEFAULT_ANONYMIZATION_OPTIONS: AnonymizationOptions = {
  anonymizeNames: true,
  anonymizeEmails: true,
  anonymizePhones: true,
  anonymizeDates: false, // Keep dates for learning context
  anonymizeIds: true,
  customPatterns: [],
};
