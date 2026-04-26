/**
 * Learning Style and Support Strategies
 *
 * Models for evidence-based learning style profiles and recommended strategies
 * for parents and teachers.
 */

import type { LearningChannel } from './learning-domains';

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
