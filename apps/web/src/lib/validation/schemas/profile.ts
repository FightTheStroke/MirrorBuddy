// ============================================================================
// VALIDATION SCHEMA: Student Profile and Insights
// ============================================================================

import { z } from 'zod';
import {
  NonEmptyString,
  OptionalString,
  NonNegativeInt,
  VALIDATION_LIMITS,
} from '../common';

// ============================================================================
// Profile observation and insight schemas
// ============================================================================

/**
 * Observation category enum
 */
export const ObservationCategory = z.enum([
  'logical_reasoning',
  'creativity',
  'verbal_expression',
  'study_method',
  'critical_thinking',
  'artistic_sensitivity',
  'scientific_curiosity',
  'spatial_memory',
  'historical_understanding',
  'mathematical_intuition',
  'linguistic_ability',
  'philosophical_depth',
  'physical_awareness',
  'experimental_approach',
  'environmental_awareness',
  'collaborative_spirit',
  'narrative_skill',
]);

/**
 * Maestro observation schema
 */
export const MaestroObservationSchema = z.object({
  id: NonEmptyString(50),
  maestroId: NonEmptyString(50),
  maestroName: NonEmptyString(100),
  category: ObservationCategory,
  observation: NonEmptyString(VALIDATION_LIMITS.LONG_STRING_MAX),
  isStrength: z.boolean(),
  confidence: z.number().min(0).max(1),
  createdAt: z.coerce.date(),
  sessionId: OptionalString(50),
}).strict();

/**
 * Learning strategy schema
 */
export const LearningStrategySchema = z.object({
  id: NonEmptyString(50),
  title: NonEmptyString(200),
  description: NonEmptyString(VALIDATION_LIMITS.LONG_STRING_MAX),
  suggestedBy: z.array(z.string().max(50)).max(VALIDATION_LIMITS.SMALL_ARRAY_MAX),
  forAreas: z.array(ObservationCategory).max(VALIDATION_LIMITS.SMALL_ARRAY_MAX),
  priority: z.enum(['high', 'medium', 'low']),
}).strict();

/**
 * Learning style profile schema
 */
export const LearningStyleProfileSchema = z.object({
  preferredChannel: z.enum(['visual', 'auditory', 'kinesthetic', 'reading_writing']),
  optimalSessionDuration: z.number().int().min(5).max(180),
  preferredTimeOfDay: z.enum(['morning', 'afternoon', 'evening']),
  motivators: z.array(z.string().max(100)).max(VALIDATION_LIMITS.SMALL_ARRAY_MAX),
  challengePreference: z.enum(['step_by_step', 'big_picture', 'mixed']),
}).strict();

/**
 * Profile insights data (nested object for POST /api/profile)
 */
export const ProfileInsightsSchema = z.object({
  raw: z.array(z.any()).max(VALIDATION_LIMITS.LARGE_ARRAY_MAX).optional(),
  strengths: z.array(MaestroObservationSchema).max(VALIDATION_LIMITS.MEDIUM_ARRAY_MAX).optional(),
  growthAreas: z.array(MaestroObservationSchema).max(VALIDATION_LIMITS.MEDIUM_ARRAY_MAX).optional(),
  strategies: z.array(LearningStrategySchema).max(VALIDATION_LIMITS.MEDIUM_ARRAY_MAX).optional(),
  learningStyle: LearningStyleProfileSchema.optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  sessionCount: NonNegativeInt.optional(),
}).strict();

// ============================================================================
// API route schemas
// ============================================================================

/**
 * GET /api/profile query params
 */
export const ProfileQuerySchema = z.object({
  userId: NonEmptyString(100),
}).strict();

/**
 * POST /api/profile request body
 */
export const ProfileCreateUpdateSchema = z.object({
  userId: NonEmptyString(100),
  studentName: NonEmptyString(100),
  insights: ProfileInsightsSchema.optional(),
}).strict();

/**
 * POST /api/profile/generate request body
 */
export const ProfileGenerateSchema = z.object({
  userId: NonEmptyString(100),
  forceRegenerate: z.boolean().optional(),
}).strict();

/**
 * POST /api/profile/consent request body
 */
export const ProfileConsentSchema = z.object({
  userId: NonEmptyString(100),
  parentConsent: z.boolean().optional(),
  studentConsent: z.boolean().optional(),
  consentGivenBy: OptionalString(100),
}).strict();

/**
 * DELETE /api/profile/consent query params
 */
export const ProfileDeleteQuerySchema = z.object({
  userId: NonEmptyString(100),
  immediate: z.enum(['true', 'false']).optional(),
}).strict();

// ============================================================================
// Export types
// ============================================================================

export type ObservationCategory = z.infer<typeof ObservationCategory>;
export type MaestroObservation = z.infer<typeof MaestroObservationSchema>;
export type LearningStrategy = z.infer<typeof LearningStrategySchema>;
export type LearningStyleProfile = z.infer<typeof LearningStyleProfileSchema>;
export type ProfileInsights = z.infer<typeof ProfileInsightsSchema>;
export type ProfileQueryInput = z.infer<typeof ProfileQuerySchema>;
export type ProfileCreateUpdateInput = z.infer<typeof ProfileCreateUpdateSchema>;
export type ProfileGenerateInput = z.infer<typeof ProfileGenerateSchema>;
export type ProfileConsentInput = z.infer<typeof ProfileConsentSchema>;
export type ProfileDeleteQueryInput = z.infer<typeof ProfileDeleteQuerySchema>;
