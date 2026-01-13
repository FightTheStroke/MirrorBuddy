// ============================================================================
// VALIDATION SCHEMA: User profile and settings
// ============================================================================

import { z } from 'zod';
import {
  SchoolLevel,
  Coach,
  Buddy,
  Theme,
  OptionalString,
  createOptionalArraySchema,
  VALIDATION_LIMITS,
} from '../common';

// ============================================================================
// AI Provider and Settings enums
// ============================================================================

/**
 * AI provider enum - valid AI service providers
 */
export const AiProvider = z.enum(['azure', 'ollama']);

/**
 * Font size enum for accessibility
 */
export const FontSize = z.enum(['small', 'medium', 'large', 'extra-large']);

// ============================================================================
// Profile update schema
// ============================================================================

/**
 * PUT /api/user/profile request body schema
 */
export const ProfileUpdateSchema = z.object({
  name: OptionalString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  age: z.number().int().min(VALIDATION_LIMITS.MIN_AGE).max(VALIDATION_LIMITS.MAX_AGE).optional(),
  schoolYear: z.number().int().min(VALIDATION_LIMITS.MIN_SCHOOL_YEAR).max(VALIDATION_LIMITS.MAX_SCHOOL_YEAR).optional(),
  schoolLevel: SchoolLevel.optional(),
  gradeLevel: OptionalString(20),
  learningGoals: createOptionalArraySchema(
    z.string().max(200),
    VALIDATION_LIMITS.SMALL_ARRAY_MAX
  ),
  preferredCoach: Coach.nullable().optional(),
  preferredBuddy: Buddy.nullable().optional(),
}).strict();

// ============================================================================
// Settings update schema
// ============================================================================

/**
 * PUT /api/user/settings request body schema
 */
export const SettingsUpdateSchema = z.object({
  // Appearance
  theme: Theme.optional(),
  language: OptionalString(10),
  accentColor: OptionalString(20),

  // AI Configuration
  provider: AiProvider.optional(),
  model: OptionalString(50),
  budgetLimit: z.number().min(0).max(10000).optional(),
  totalSpent: z.number().min(0).optional(),

  // Accessibility
  fontSize: FontSize.optional(),
  highContrast: z.boolean().optional(),
  dyslexiaFont: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  voiceEnabled: z.boolean().optional(),
  simplifiedLanguage: z.boolean().optional(),
  adhdMode: z.boolean().optional(),
}).strict();

// ============================================================================
// Export types
// ============================================================================

export type AiProvider = z.infer<typeof AiProvider>;
export type FontSize = z.infer<typeof FontSize>;
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
export type SettingsUpdateInput = z.infer<typeof SettingsUpdateSchema>;
