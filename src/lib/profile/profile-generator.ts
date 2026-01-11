/**
 * MirrorBuddy Profile Generator
 *
 * Generates and synthesizes student profiles from Maestri observations.
 * Uses Melissa (Learning Coach) to create balanced, growth-mindset profiles.
 *
 * Part of F-02: Profile Generation from Maestri
 * Related: #31 Collaborative Student Profile
 */

import type { StudentInsights } from '@/types';
import type { MaestroInsightInput, ProfileGenerationOptions } from './profile-generator/types';
import { DEFAULT_OPTIONS } from './profile-generator/constants';
import { convertToObservation, generateStrategies, inferLearningStyle } from './profile-generator/utils';

export type { MaestroInsightInput, ProfileGenerationOptions, SynthesisContext } from './profile-generator/types';
export { MELISSA_SYNTHESIS_PROMPT, createSynthesisContext, formatSynthesisPrompt } from './profile-generator/synthesis';

// ============================================================================
// PROFILE GENERATION
// ============================================================================

/**
 * Generates a comprehensive student insights profile from Maestri observations.
 *
 * @param studentId - The student's unique identifier
 * @param studentName - The student's display name
 * @param insights - Array of insights collected from Maestri interactions
 * @param options - Generation options
 * @returns Complete StudentInsights object for the parent dashboard
 */
export function generateStudentProfile(
  studentId: string,
  studentName: string,
  insights: MaestroInsightInput[],
  sessionStats: { totalSessions: number; totalMinutes: number; maestriInteracted: string[] },
  options: ProfileGenerationOptions = {}
): StudentInsights {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Filter by confidence threshold
  const validInsights = insights
    .filter((i) => i.confidence >= opts.minConfidence)
    .slice(0, opts.maxInsights);

  // Separate strengths and growth areas
  const strengths = validInsights.filter((i) => i.isStrength);
  const growthAreas = validInsights.filter((i) => !i.isStrength);

  // Convert to MaestroObservation format
  const strengthObservations = strengths.map(convertToObservation);
  const growthObservations = growthAreas.map(convertToObservation);

  // Generate strategies based on growth areas
  const strategies = generateStrategies(growthAreas);

  // Infer learning style from observations
  const learningStyle = inferLearningStyle(validInsights);

  return {
    studentId,
    studentName,
    lastUpdated: new Date(),
    strengths: strengthObservations,
    growthAreas: growthObservations,
    strategies,
    learningStyle,
    totalSessions: sessionStats.totalSessions,
    totalMinutes: sessionStats.totalMinutes,
    maestriInteracted: sessionStats.maestriInteracted,
  };
}

