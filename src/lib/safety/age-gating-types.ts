/**
 * Age Gating Types
 * Shared type definitions for age-gating modules
 * Extracted to break circular dependency between core and matrix
 */

/**
 * Age brackets for content filtering
 * Based on Italian educational system stages
 */
export type AgeBracket =
  | 'elementary' // 6-10 anni (scuola primaria)
  | 'middle' // 11-13 anni (scuola secondaria di primo grado)
  | 'highschool' // 14-19 anni (scuola secondaria di secondo grado)
  | 'adult'; // 20+ (adulti)

/**
 * Topic sensitivity levels
 */
export type TopicSensitivity = 'safe' | 'moderate' | 'restricted' | 'blocked';

/**
 * Content topic categories
 */
export type ContentTopic =
  | 'basic_education' // Math, reading, basic science
  | 'history_war' // Historical wars, conflicts
  | 'history_violence' // Historical violence (Holocaust, slavery)
  | 'biology_reproduction' // Human reproduction, puberty
  | 'health_mental' // Mental health topics
  | 'health_physical' // Physical health, diseases
  | 'social_relationships' // Friendships, social dynamics
  | 'social_romance' // Romantic relationships
  | 'current_events' // News, politics
  | 'philosophy_ethics' // Ethics, moral dilemmas
  | 'literature_mature' // Mature literary themes
  | 'economics_finance'; // Money, economy

/**
 * Age gating configuration result
 */
export interface AgeGateResult {
  /** Whether the content is appropriate for the age */
  appropriate: boolean;
  /** Sensitivity level of the topic for this age */
  sensitivity: TopicSensitivity;
  /** Recommended handling */
  handling: 'allow' | 'simplify' | 'redirect' | 'block';
  /** Guidance for content adaptation */
  guidance?: string;
  /** Alternative topic suggestion if blocked */
  alternative?: string;
}
