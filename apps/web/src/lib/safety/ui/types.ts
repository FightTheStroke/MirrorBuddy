/**
 * Safety UI Types
 * Part of Ethical Design Hardening (F-05, F-06)
 *
 * Types for displaying safety information to users
 * in a child-friendly, educational way.
 */

/**
 * Safety filter result types
 */
export type SafetyFilterType =
  | 'content_inappropriate'   // Inappropriate content for minors
  | 'off_topic'               // Not related to educational goals
  | 'personal_info_request'   // Asking for personal info
  | 'harmful_content'         // Potentially harmful content
  | 'manipulation_attempt'    // Prompt injection/jailbreak
  | 'medical_advice'          // Unsolicited medical advice
  | 'legal_advice'            // Legal advice outside scope
  | 'unknown';                // Could not categorize

/**
 * Severity levels for safety indicators
 */
export type SafetySeverity = 'info' | 'warning' | 'blocked';

/**
 * UI configuration for safety indicator
 */
export interface SafetyIndicatorConfig {
  /** Whether to show indicator */
  show: boolean;
  /** Severity level */
  severity: SafetySeverity;
  /** Icon to display */
  icon: 'info' | 'shield' | 'warning' | 'stop';
  /** Color for visual indicator */
  color: 'blue' | 'yellow' | 'orange' | 'red';
  /** Short label */
  label: string;
  /** User-friendly message */
  message: string;
  /** Optional educational explanation */
  explanation?: string;
}

/**
 * Block explanation for user display
 */
export interface BlockExplanation {
  /** Type of filter that triggered */
  filterType: SafetyFilterType;
  /** Child-friendly explanation */
  friendlyExplanation: string;
  /** What the user can do instead */
  suggestedAction: string;
  /** Whether to suggest asking a parent */
  suggestAskParent: boolean;
  /** Related topics that ARE allowed */
  relatedAllowedTopics?: string[];
}

/**
 * Safety filter result from monitoring system
 */
export interface SafetyFilterResult {
  /** Whether content was filtered */
  wasFiltered: boolean;
  /** Type of filter applied (if filtered) */
  filterType?: SafetyFilterType;
  /** Confidence in the filter decision (0-1) */
  confidence?: number;
  /** Internal reason (for logging) */
  internalReason?: string;
  /** Original content hash (for audit) */
  contentHash?: string;
}

/**
 * Italian labels for safety UI
 */
export const SAFETY_LABELS = {
  severity: {
    info: 'Informazione',
    warning: 'Attenzione',
    blocked: 'Contenuto non disponibile',
  },
  filterTypes: {
    content_inappropriate: 'Contenuto non adatto',
    off_topic: 'Fuori tema',
    personal_info_request: 'Richiesta dati personali',
    harmful_content: 'Contenuto potenzialmente dannoso',
    manipulation_attempt: 'Richiesta non valida',
    medical_advice: 'Consiglio medico',
    legal_advice: 'Consiglio legale',
    unknown: 'Filtro di sicurezza',
  },
  actions: {
    try_different: 'Prova a fare una domanda diversa',
    ask_teacher: 'Chiedi aiuto al tuo insegnante',
    ask_parent: 'Chiedi a un genitore',
    stay_on_topic: 'Restiamo sugli argomenti di studio',
    rephrase: 'Prova a riformulare la domanda',
  },
} as const;
