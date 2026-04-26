/**
 * Student Profile and Historical Snapshots
 *
 * Complete student profile synthesized from multiple Maestro interactions
 * and historical snapshots for longitudinal tracking.
 */

import type { MaestroInsight, StrengthArea, GrowthArea } from './insights';
import type { LearningStyle, Strategy } from './learning-style';
import type { ProfileVisibility, ProfileAccess } from './access-control';

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
