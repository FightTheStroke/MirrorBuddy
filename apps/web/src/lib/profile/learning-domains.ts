/**
 * Learning Domains and Channels
 *
 * Based on:
 * - Gardner's Multiple Intelligences
 * - Universal Design for Learning (UDL) principles
 */

/**
 * Learning domains mapped to Gardner's Multiple Intelligences
 */
export const LEARNING_DOMAINS = [
  'logical-mathematical',
  'linguistic',
  'spatial',
  'musical',
  'bodily-kinesthetic',
  'interpersonal',
  'intrapersonal',
  'naturalistic',
] as const;

export type LearningDomain = (typeof LEARNING_DOMAINS)[number];

/**
 * Preferred learning channels (UDL principles)
 */
export const LEARNING_CHANNELS = ['visual', 'auditory', 'kinesthetic', 'reading-writing'] as const;

export type LearningChannel = (typeof LEARNING_CHANNELS)[number];
