// ============================================================================
// VALIDATION SCHEMA: Progress API
// ============================================================================

import { z } from 'zod';
import {
  MaestroId,
  NonNegativeInt,
  IsoDateString,
  NonEmptyString,
  OptionalString,
  VALIDATION_LIMITS,
  createOptionalArraySchema,
} from '../common';

// ============================================================================
// Constants for progress-specific limits
// ============================================================================

const PROGRESS_LIMITS = {
  MAX_XP: 10000000,
  MAX_LEVEL: 100,
  MIN_LEVEL: 1,
  MAX_STUDY_MINUTES: 100000,
  MAX_QUESTIONS: 100000,
  MAX_SESSIONS_PER_WEEK: 1000,
  MAX_STREAK: 10000,
  MAX_ACHIEVEMENTS: 100,
  MAX_MASTERIES: 50,
  MAX_SEASON_HISTORY: 100,
  MAX_ACHIEVEMENT_NAME: 100,
  MAX_ACHIEVEMENT_DESC: 500,
  MAX_SUBJECT_NAME: 50,
  MAX_MASTERY_LEVEL: 100,
} as const;

// ============================================================================
// Season schema
// ============================================================================

/**
 * Season name enum
 */
export const SeasonName = z.enum(['Autunno', 'Inverno', 'Primavera', 'Estate']);

/**
 * Current season schema
 */
export const CurrentSeasonSchema = z.object({
  name: SeasonName,
  startDate: z.union([IsoDateString, z.date()]),
  endDate: z.union([IsoDateString, z.date()]),
  icon: z.string().min(1),
});

/**
 * Season history entry schema
 */
export const SeasonHistorySchema = z.object({
  season: SeasonName,
  year: z.number().int(),
  mirrorBucksEarned: NonNegativeInt,
  levelReached: z.number().int().min(PROGRESS_LIMITS.MIN_LEVEL).max(PROGRESS_LIMITS.MAX_LEVEL),
  achievementsUnlocked: NonNegativeInt,
  studyMinutes: NonNegativeInt,
});

// ============================================================================
// Achievement and mastery schemas
// ============================================================================

/**
 * Achievement schema
 */
export const AchievementSchema = z.object({
  id: z.string().min(1),
  name: NonEmptyString(PROGRESS_LIMITS.MAX_ACHIEVEMENT_NAME),
  description: OptionalString(PROGRESS_LIMITS.MAX_ACHIEVEMENT_DESC),
  unlockedAt: z.union([IsoDateString, z.date()]).optional(),
});

/**
 * Subject mastery schema
 */
export const MasterySchema = z.object({
  subject: NonEmptyString(PROGRESS_LIMITS.MAX_SUBJECT_NAME),
  level: z.number().int().min(0).max(PROGRESS_LIMITS.MAX_MASTERY_LEVEL),
  xp: NonNegativeInt.optional(),
});

// ============================================================================
// Streak schema
// ============================================================================

/**
 * Streak schema
 */
export const StreakSchema = z.object({
  current: z.number().int().min(0).max(PROGRESS_LIMITS.MAX_STREAK).optional(),
  longest: z.number().int().min(0).max(PROGRESS_LIMITS.MAX_STREAK).optional(),
  lastStudyDate: z.union([IsoDateString, z.date()]).optional(),
});

// ============================================================================
// Progress update schema
// ============================================================================

/**
 * PUT /api/progress request body schema
 */
export const ProgressUpdateSchema = z.object({
  xp: z.number().int().min(0).max(PROGRESS_LIMITS.MAX_XP).optional(), // Backward compatibility
  mirrorBucks: z.number().int().min(0).max(PROGRESS_LIMITS.MAX_XP).optional(),
  level: z.number().int().min(PROGRESS_LIMITS.MIN_LEVEL).max(PROGRESS_LIMITS.MAX_LEVEL).optional(),
  // Season system
  seasonMirrorBucks: z.number().int().min(0).max(PROGRESS_LIMITS.MAX_XP).optional(),
  seasonLevel: z.number().int().min(PROGRESS_LIMITS.MIN_LEVEL).max(PROGRESS_LIMITS.MAX_LEVEL).optional(),
  allTimeLevel: z.number().int().min(PROGRESS_LIMITS.MIN_LEVEL).max(PROGRESS_LIMITS.MAX_LEVEL).optional(),
  currentSeason: CurrentSeasonSchema.optional(),
  seasonHistory: createOptionalArraySchema(SeasonHistorySchema, PROGRESS_LIMITS.MAX_SEASON_HISTORY),
  // Other fields
  totalStudyMinutes: z.number().int().min(0).max(PROGRESS_LIMITS.MAX_STUDY_MINUTES).optional(),
  questionsAsked: z.number().int().min(0).max(PROGRESS_LIMITS.MAX_QUESTIONS).optional(),
  sessionsThisWeek: z.number().int().min(0).max(PROGRESS_LIMITS.MAX_SESSIONS_PER_WEEK).optional(),
  streak: StreakSchema.optional(),
  achievements: createOptionalArraySchema(AchievementSchema, PROGRESS_LIMITS.MAX_ACHIEVEMENTS),
  masteries: createOptionalArraySchema(MasterySchema, PROGRESS_LIMITS.MAX_MASTERIES),
}).strict();

// ============================================================================
// Study session schemas
// ============================================================================

/**
 * GET /api/progress/sessions query params schema
 */
export const SessionsGetQuerySchema = z.object({
  limit: z.number().int().min(1).max(VALIDATION_LIMITS.MEDIUM_ARRAY_MAX).optional().default(20),
  maestroId: MaestroId.optional(),
});

/**
 * POST /api/progress/sessions request body schema
 */
export const SessionsPostSchema = z.object({
  maestroId: MaestroId,
  subject: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
}).strict();

/**
 * PATCH /api/progress/sessions request body schema
 */
export const SessionsPatchSchema = z.object({
  id: z.string().min(1),
  duration: NonNegativeInt.optional(),
  xpEarned: NonNegativeInt.optional(),
  questions: NonNegativeInt.optional(),
}).strict();

// ============================================================================
// Flashcard progress schemas
// ============================================================================

/**
 * Flashcard state enum
 */
export const FlashcardState = z.enum(['new', 'learning', 'review', 'relearning']);

/**
 * GET /api/flashcards/progress query params schema
 */
export const FlashcardProgressGetQuerySchema = z.object({
  deckId: z.string().optional(),
  due: z.enum(['true', 'false']).optional(),
});

/**
 * POST /api/flashcards/progress request body schema
 */
export const FlashcardProgressPostSchema = z.object({
  cardId: z.string().min(1),
  deckId: z.string().optional(),
  difficulty: z.number().min(0).max(10).optional(),
  stability: z.number().min(0).optional(),
  retrievability: z.number().min(0).max(1).optional(),
  state: FlashcardState.optional(),
  reps: NonNegativeInt.optional(),
  lapses: NonNegativeInt.optional(),
  lastReview: z.union([IsoDateString, z.date()]).optional(),
  nextReview: z.union([IsoDateString, z.date()]).optional(),
}).strict();

// ============================================================================
// Export types
// ============================================================================

export type SeasonName = z.infer<typeof SeasonName>;
export type CurrentSeason = z.infer<typeof CurrentSeasonSchema>;
export type SeasonHistory = z.infer<typeof SeasonHistorySchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type Mastery = z.infer<typeof MasterySchema>;
export type Streak = z.infer<typeof StreakSchema>;
export type ProgressUpdateInput = z.infer<typeof ProgressUpdateSchema>;
export type SessionsGetQuery = z.infer<typeof SessionsGetQuerySchema>;
export type SessionsPostInput = z.infer<typeof SessionsPostSchema>;
export type SessionsPatchInput = z.infer<typeof SessionsPatchSchema>;
export type FlashcardState = z.infer<typeof FlashcardState>;
export type FlashcardProgressGetQuery = z.infer<typeof FlashcardProgressGetQuerySchema>;
export type FlashcardProgressPostInput = z.infer<typeof FlashcardProgressPostSchema>;
