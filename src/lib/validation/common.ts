// ============================================================================
// VALIDATION: Common utilities and reusable schemas
// ============================================================================

import { z } from 'zod';

// ============================================================================
// Constants
// ============================================================================

export const VALIDATION_LIMITS = {
  // String lengths
  SHORT_STRING_MAX: 100,
  MEDIUM_STRING_MAX: 500,
  LONG_STRING_MAX: 2000,
  EXTRA_LONG_STRING_MAX: 10000,

  // Array sizes
  SMALL_ARRAY_MAX: 20,
  MEDIUM_ARRAY_MAX: 100,
  LARGE_ARRAY_MAX: 1000,

  // Numbers
  MIN_AGE: 5,
  MAX_AGE: 100,
  MIN_SCHOOL_YEAR: 1,
  MAX_SCHOOL_YEAR: 13,

  // Messages
  MIN_MESSAGES: 1,
  MAX_MESSAGES: 100,
  MAX_MESSAGE_LENGTH: 10000,
} as const;

// ============================================================================
// Reusable base schemas
// ============================================================================

/**
 * Non-empty string with max length
 */
export const NonEmptyString = (maxLength = VALIDATION_LIMITS.SHORT_STRING_MAX) =>
  z.string().min(1, 'String cannot be empty').max(maxLength);

/**
 * Optional string with max length
 */
export const OptionalString = (maxLength = VALIDATION_LIMITS.SHORT_STRING_MAX) =>
  z.string().max(maxLength).optional();

/**
 * Positive integer
 */
export const PositiveInt = z.number().int().positive();

/**
 * Non-negative integer
 */
export const NonNegativeInt = z.number().int().min(0);

/**
 * UUID string
 */
export const UuidString = z.string().uuid();

/**
 * ISO date string
 */
export const IsoDateString = z.string().datetime();

/**
 * Email address
 */
export const Email = z.string().email();

/**
 * URL string
 */
export const UrlString = z.string().url();

// ============================================================================
// Common domain schemas
// ============================================================================

/**
 * School level enum
 */
export const SchoolLevel = z.enum(['elementare', 'media', 'superiore']);

/**
 * Coach enum
 */
export const Coach = z.enum(['melissa', 'roberto', 'chiara', 'andrea', 'favij']);

/**
 * Buddy enum
 */
export const Buddy = z.enum(['mario', 'noemi', 'enea', 'bruno', 'sofia']);

/**
 * Maestro ID enum (all 17 maestros)
 */
export const MaestroId = z.enum([
  'socrates',
  'leo',
  'ada',
  'einstein',
  'marie',
  'turing',
  'jane',
  'shakespeare',
  'mozart',
  'pythagoras',
  'hypatia',
  'tesla',
  'dali',
  'aristotle',
  'frida',
  'darwin',
  'rosa',
]);

/**
 * DSA profile type enum
 */
export const DsaProfile = z.enum([
  'dyslexia',
  'dyscalculia',
  'dysgraphia',
  'dysorthography',
  'adhd',
  'dyspraxia',
  'stuttering',
]);

/**
 * Theme enum
 */
export const Theme = z.enum(['light', 'dark', 'system']);

/**
 * Tool type enum
 */
export const ToolType = z.enum([
  'summary',
  'mindmap',
  'flashcards',
  'quiz',
  'outline',
  'key-concepts',
]);

// ============================================================================
// Validation helpers
// ============================================================================

/**
 * Create an array schema with min/max constraints
 */
export function createArraySchema<T extends z.ZodTypeAny>(
  itemSchema: T,
  options: {
    min?: number;
    max?: number;
    errorMessage?: string;
  } = {}
) {
  let schema = z.array(itemSchema);

  if (options.min !== undefined) {
    schema = schema.min(options.min, options.errorMessage);
  }

  if (options.max !== undefined) {
    schema = schema.max(options.max, options.errorMessage);
  }

  return schema;
}

/**
 * Create an optional array schema
 */
export function createOptionalArraySchema<T extends z.ZodTypeAny>(
  itemSchema: T,
  maxItems = VALIDATION_LIMITS.SMALL_ARRAY_MAX
) {
  return z.array(itemSchema).max(maxItems).optional();
}
