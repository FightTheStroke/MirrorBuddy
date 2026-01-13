// ============================================================================
// VALIDATION SCHEMA: Learning Path API
// ============================================================================

import { z } from 'zod';
import {
  NonEmptyString,
  OptionalString,
  VALIDATION_LIMITS,
  createArraySchema,
} from '../common';

// ============================================================================
// Learning Path Topic schema
// ============================================================================

/**
 * Difficulty level enum for learning path topics
 */
export const TopicDifficulty = z.enum(['beginner', 'intermediate', 'advanced']);

/**
 * Individual topic schema within a learning path
 */
export const LearningPathTopicSchema = z.object({
  title: NonEmptyString(200),
  description: OptionalString(VALIDATION_LIMITS.LONG_STRING_MAX),
  keyConcepts: z.array(z.string().max(200)).max(VALIDATION_LIMITS.SMALL_ARRAY_MAX).optional(),
  difficulty: TopicDifficulty.optional(),
  order: z.number().int().positive().optional(),
}).strict();

// ============================================================================
// Learning Path Request schema
// ============================================================================

/**
 * POST /api/learning-path request body schema
 */
export const CreateLearningPathSchema = z.object({
  title: NonEmptyString(200),
  subject: OptionalString(200),
  sourceStudyKitId: z.string().optional(),
  topics: createArraySchema(LearningPathTopicSchema, {
    min: 1,
    errorMessage: 'Topics array must contain at least one topic',
  }),
  visualOverview: z.string().max(VALIDATION_LIMITS.EXTRA_LONG_STRING_MAX).optional(),
}).strict();

// Export types
export type TopicDifficulty = z.infer<typeof TopicDifficulty>;
export type LearningPathTopic = z.infer<typeof LearningPathTopicSchema>;
export type CreateLearningPathInput = z.infer<typeof CreateLearningPathSchema>;
