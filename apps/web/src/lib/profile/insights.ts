/**
 * Learning Insights and Observations
 *
 * Models for capturing observations from Maestros and synthesizing them
 * into identified strengths and growth areas.
 */

import type { LearningDomain } from './learning-domains';

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
