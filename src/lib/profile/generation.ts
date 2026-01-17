/**
 * Profile Generation Options and Results
 *
 * Configuration for profile generation and metadata about generation results.
 */

import type { StudentProfile } from './profile';

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
