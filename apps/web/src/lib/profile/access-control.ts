/**
 * Profile Access Control and Privacy
 *
 * GDPR-compliant access control, consent tracking, and audit trail
 * for student profile visibility and usage.
 */

/**
 * Access control levels for profile visibility
 */
export type ProfileVisibility = 'parents' | 'teachers' | 'both';

/**
 * GDPR-compliant access control and consent
 */
export interface ProfileAccess {
  /** Parent/guardian has consented to profile creation */
  parentConsent: boolean;
  /** Student has consented (if age appropriate, 16+ in EU) */
  studentConsent: boolean;
  /** Date consent was given */
  consentDate: Date;
  /** Access log for audit trail */
  accessLog: AccessEvent[];
  /** Whether profile can be deleted (GDPR right to erasure) */
  canDelete: boolean;
  /** Date deletion was requested (if applicable) */
  deletionRequested?: Date;
}

/**
 * Audit trail event for profile access
 */
export interface AccessEvent {
  /** Unique event ID */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** Who accessed (user ID) */
  userId: string;
  /** Type of access */
  action: 'view' | 'download' | 'share' | 'edit' | 'delete_request';
  /** Additional details */
  details?: string;
}

/**
 * Issue found during inclusive language validation
 */
export interface LanguageIssue {
  /** Type of issue */
  type:
    | 'deficit-framing'
    | 'non-person-first'
    | 'comparison-to-normal'
    | 'fixed-mindset'
    | 'stereotype';
  /** Original text with issue */
  originalText: string;
  /** Suggested replacement */
  suggestedText: string;
  /** Location in profile */
  location: string;
}

/**
 * Validation result for inclusive language check
 */
export interface LanguageValidationResult {
  /** Whether validation passed */
  passed: boolean;
  /** Issues found */
  issues: LanguageIssue[];
  /** Suggestions for improvement */
  suggestions: string[];
}
