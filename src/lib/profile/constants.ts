/**
 * Profile Constants and Mappings
 *
 * Configuration constants for profile generation and Maestro domain mappings.
 */

import type { LearningDomain } from './learning-domains';
import type { ProfileGenerationOptions } from './generation';

/**
 * Maestro domain mapping
 * Maps each Maestro to their primary observation domain
 */
export const MAESTRO_DOMAIN_MAP: Record<string, LearningDomain> = {
  archimede: 'logical-mathematical',
  leonardo: 'spatial',
  dante: 'linguistic',
  montessori: 'intrapersonal',
  socrate: 'interpersonal',
  mozart: 'musical',
  darwin: 'naturalistic',
  'marco-polo': 'spatial',
  galileo: 'logical-mathematical',
  shakespeare: 'linguistic',
  curie: 'logical-mathematical',
  aristotele: 'interpersonal',
  beethoven: 'musical',
  einstein: 'logical-mathematical',
  michelangelo: 'spatial',
  cleopatra: 'interpersonal',
  confucio: 'intrapersonal',
};

/**
 * Default profile generation options
 */
export const DEFAULT_PROFILE_OPTIONS: Required<ProfileGenerationOptions> = {
  minSessionsPerMaestro: 3,
  recentWindowDays: 30,
  includeHistory: true,
  forceRegenerate: false,
};

/**
 * Minimum confidence threshold for including insights
 */
export const MIN_CONFIDENCE_THRESHOLD = 0.3;

/**
 * Maximum profile age before regeneration suggested (days)
 */
export const PROFILE_REFRESH_DAYS = 14;
