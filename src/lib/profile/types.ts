/**
 * Student Profile Data Model
 * Multi-Maestro Learning Insights for Parents
 *
 * Based on:
 * - Gardner's Multiple Intelligences
 * - Universal Design for Learning (UDL)
 * - Neurodiversity paradigm
 * - Evidence-based learning strategies
 *
 * Related: Issue #31
 */

/**
 * Learning domains mapped to Gardner's Multiple Intelligences
 */
export const LEARNING_DOMAINS = [
  'logical-mathematical',
  'linguistic',
  'spatial',
  'musical',
  'bodily-kinesthetic',
  'interpersonal',
  'intrapersonal',
  'naturalistic',
] as const;

export type LearningDomain = (typeof LEARNING_DOMAINS)[number];

/**
 * Preferred learning channels (UDL principles)
 */
export const LEARNING_CHANNELS = ['visual', 'auditory', 'kinesthetic', 'reading-writing'] as const;

export type LearningChannel = (typeof LEARNING_CHANNELS)[number];

/**
 * Access control levels for profile visibility
 */
export type ProfileVisibility = 'parents' | 'teachers' | 'both';

/**
 * Insight from a single Maestro about the student
 */
export interface MaestroInsight {
  /** ID of the maestro who made this observation */
  maestroId: string;
  /** Date of observation */
  observationDate: Date;
  /** Learning domain this insight relates to */
  domain: LearningDomain;
  /** Specific observations about the student */
  observations: string[];
  /** Session IDs that provide evidence for this insight */
  evidenceSessions: string[];
  /** Confidence level 0-1 based on interaction count */
  confidenceLevel: number;
}

/**
 * Identified strength area for the student
 */
export interface StrengthArea {
  /** Name of the strength area */
  area: string;
  /** Description using growth mindset language */
  description: string;
  /** Maestri who contributed to identifying this */
  contributingMaestri: string[];
  /** Concrete examples from sessions */
  examples: string[];
  /** Suggestions for further development */
  developmentSuggestions: string[];
}

/**
 * Area where the student is developing (NOT "weakness")
 * Uses growth mindset framing
 */
export interface GrowthArea {
  /** Name of the growth area */
  area: string;
  /** Description using positive, growth-oriented language */
  description: string;
  /** Current state description (what student can do now) */
  currentState: string;
  /** Target state (what we're working toward) */
  targetState: string;
  /** Evidence-based strategies to support growth */
  strategies: string[];
  /** Estimated timeframe for progress */
  estimatedTimeframe: string;
}

/**
 * Evidence-based learning style profile
 */
export interface LearningStyle {
  /** Preferred sensory channels for learning */
  preferredChannels: LearningChannel[];
  /** Optimal session length in minutes */
  optimalSessionLength: number;
  /** Recommended break frequency in minutes */
  breakFrequency: number;
  /** What motivates this student */
  motivators: string[];
  /** What causes stress/frustration */
  stressors: string[];
  /** Preferred time of day for learning */
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening';
  /** Environmental preferences */
  environmentPreferences?: string[];
}

/**
 * Recommended strategy for parents/teachers
 */
export interface Strategy {
  /** Strategy title */
  title: string;
  /** Detailed description */
  description: string;
  /** How to implement this strategy */
  implementation: string[];
  /** Which area(s) this strategy supports */
  targetAreas: string[];
  /** Evidence base for this strategy */
  evidenceSource: string;
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
}

/**
 * Historical snapshot of profile for longitudinal tracking
 */
export interface ProfileSnapshot {
  /** Snapshot date */
  date: Date;
  /** Strengths at this point */
  strengths: StrengthArea[];
  /** Growth areas at this point */
  growthAreas: GrowthArea[];
  /** Notable changes since last snapshot */
  changes: string[];
}

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
 * Complete Student Profile
 * Synthesized from multiple Maestro interactions
 */
export interface StudentProfile {
  /** Unique profile ID */
  id: string;
  /** Student user ID */
  studentId: string;
  /** Student display name (for UI) */
  studentName: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;

  /** Access control settings */
  visibleTo: ProfileVisibility;
  /** Consent and access tracking */
  access: ProfileAccess;

  /** Raw insights from each Maestro */
  insights: MaestroInsight[];

  /** Synthesized strength areas */
  strengths: StrengthArea[];
  /** Synthesized growth areas */
  growthAreas: GrowthArea[];
  /** Inferred learning style */
  learningStyle: LearningStyle;
  /** Recommended strategies */
  strategies: Strategy[];

  /** Historical snapshots for progress tracking */
  progressHistory: ProfileSnapshot[];

  /** Total number of sessions used for this profile */
  sessionCount: number;
  /** Last session used for insights */
  lastSessionId: string;
}

/**
 * Profile generation options
 */
export interface ProfileGenerationOptions {
  /** Minimum sessions required per Maestro for confident insights */
  minSessionsPerMaestro?: number;
  /** Time window for recent interactions (days) */
  recentWindowDays?: number;
  /** Include historical snapshots in generation */
  includeHistory?: boolean;
  /** Force regeneration even if recent profile exists */
  forceRegenerate?: boolean;
}

/**
 * Profile generation result
 */
export interface ProfileGenerationResult {
  /** Generated profile */
  profile: StudentProfile;
  /** Warnings during generation */
  warnings: string[];
  /** Maestri with insufficient data */
  insufficientDataMaestri: string[];
  /** Generation metadata */
  metadata: {
    generatedAt: Date;
    sessionsAnalyzed: number;
    maestriContributing: number;
    confidenceScore: number;
  };
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
 * PDF report generation options
 */
export interface ReportOptions {
  /** Include full history */
  includeHistory?: boolean;
  /** Include evidence session IDs */
  includeEvidence?: boolean;
  /** Include strategies section */
  includeStrategies?: boolean;
  /** Report language */
  language?: 'it' | 'en';
  /** Custom header/footer text */
  headerText?: string;
  /** Watermark for privacy */
  addWatermark?: boolean;
}

/**
 * Maestro domain mapping
 * Maps each Maestro to their primary observation domain
 */
export const MAESTRO_DOMAIN_MAP: Record<string, LearningDomain> = {
  archimede: 'logical-mathematical',
  leonardo: 'spatial',
  dante: 'linguistic',
  montessori: 'intrapersonal',
  socrate: 'interpersonal',
  mozart: 'musical',
  darwin: 'naturalistic',
  'marco-polo': 'spatial',
  galileo: 'logical-mathematical',
  shakespeare: 'linguistic',
  curie: 'logical-mathematical',
  aristotele: 'interpersonal',
  beethoven: 'musical',
  einstein: 'logical-mathematical',
  michelangelo: 'spatial',
  cleopatra: 'interpersonal',
  confucio: 'intrapersonal',
};

/**
 * Default profile generation options
 */
export const DEFAULT_PROFILE_OPTIONS: Required<ProfileGenerationOptions> = {
  minSessionsPerMaestro: 3,
  recentWindowDays: 30,
  includeHistory: true,
  forceRegenerate: false,
};

/**
 * Minimum confidence threshold for including insights
 */
export const MIN_CONFIDENCE_THRESHOLD = 0.3;

/**
 * Maximum profile age before regeneration suggested (days)
 */
export const PROFILE_REFRESH_DAYS = 14;
