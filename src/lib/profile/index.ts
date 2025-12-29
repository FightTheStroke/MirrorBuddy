/**
 * ConvergioEdu Student Profile Module
 * Multi-Maestro Learning Insights for Parents
 *
 * This module provides:
 * - Type definitions for student profiles
 * - Profile generation from Maestro interactions
 * - Inclusive language validation
 * - Evidence linking to sessions
 * - PDF report generation
 *
 * Related: Issue #31
 */

// Types
export type {
  LearningDomain,
  LearningChannel,
  ProfileVisibility,
  MaestroInsight,
  StrengthArea,
  GrowthArea,
  LearningStyle,
  Strategy,
  ProfileSnapshot,
  ProfileAccess,
  AccessEvent,
  StudentProfile,
  ProfileGenerationOptions,
  ProfileGenerationResult,
  LanguageValidationResult,
  LanguageIssue,
  ReportOptions,
} from './types';

// Constants
export {
  LEARNING_DOMAINS,
  LEARNING_CHANNELS,
  MAESTRO_DOMAIN_MAP,
  DEFAULT_PROFILE_OPTIONS,
  MIN_CONFIDENCE_THRESHOLD,
  PROFILE_REFRESH_DAYS,
} from './types';
