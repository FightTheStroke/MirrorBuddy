/**
 * Types for Profile Generator
 */

import type {
  StudentInsights,
  ObservationCategory,
} from '@/types';

/**
 * Raw insight collected from a Maestro interaction.
 */
export interface MaestroInsightInput {
  maestroId: string;
  maestroName: string;
  category: ObservationCategory;
  content: string;
  isStrength: boolean;
  confidence: number;
  sessionId?: string;
  createdAt: Date;
}

/**
 * Options for profile generation.
 */
export interface ProfileGenerationOptions {
  /** Maximum insights to process */
  maxInsights?: number;
  /** Minimum confidence threshold for inclusion */
  minConfidence?: number;
  /** Whether to include AI synthesis */
  includeSynthesis?: boolean;
}

/**
 * Context for Melissa's profile synthesis.
 */
export interface SynthesisContext {
  studentName: string;
  strengths: MaestroInsightInput[];
  growthAreas: MaestroInsightInput[];
  recentSessions: number;
  totalMinutes: number;
}
