// ============================================================================
// VALIDATION SCHEMA: Gamification API
// ============================================================================

import { z } from 'zod';
import {
  NonEmptyString,
  OptionalString,
  PositiveInt,
  NonNegativeInt,
  VALIDATION_LIMITS,
} from '../common';

// ============================================================================
// Award Points schema
// ============================================================================

/**
 * POST /api/gamification/points request body schema
 * Awards points to a user for various activities
 */
export const AwardPointsRequestSchema = z.object({
  points: PositiveInt.describe('Points to award (must be positive)'),
  reason: NonEmptyString(VALIDATION_LIMITS.MEDIUM_STRING_MAX).describe('Reason for awarding points'),
  sourceId: OptionalString(VALIDATION_LIMITS.SHORT_STRING_MAX).describe('ID of the triggering entity (optional)'),
  sourceType: OptionalString(VALIDATION_LIMITS.SHORT_STRING_MAX).describe('Type of source entity (optional)'),
}).strict();

// ============================================================================
// Update Streak schema
// ============================================================================

/**
 * POST /api/gamification/streak request body schema
 * Updates user's study streak with activity minutes
 */
export const UpdateStreakRequestSchema = z.object({
  minutes: NonNegativeInt.describe('Minutes studied (must be non-negative)'),
}).strict();

// Export types
export type AwardPointsRequestInput = z.infer<typeof AwardPointsRequestSchema>;
export type UpdateStreakRequestInput = z.infer<typeof UpdateStreakRequestSchema>;
