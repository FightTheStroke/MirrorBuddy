// ============================================================================
// AGE GATING CORE
// Core functions for age gating checks
// ============================================================================

import { logger } from '@/lib/logger';
import type { AgeBracket, ContentTopic, TopicSensitivity, AgeGateResult } from './types';
import { TOPIC_MATRIX, ADAPTATION_GUIDANCE, ALTERNATIVE_SUGGESTIONS } from './topic-matrix';

/**
 * Determine age bracket from numeric age
 */
export function getAgeBracket(age: number): AgeBracket {
  if (age < 6) return 'elementary'; // Treat pre-school as elementary
  if (age <= 10) return 'elementary';
  if (age <= 13) return 'middle';
  if (age <= 19) return 'highschool';
  return 'adult';
}

/**
 * Map sensitivity level to handling action
 */
function sensitivityToHandling(sensitivity: TopicSensitivity): AgeGateResult['handling'] {
  switch (sensitivity) {
    case 'safe':
      return 'allow';
    case 'moderate':
      return 'simplify';
    case 'restricted':
      return 'redirect';
    case 'blocked':
      return 'block';
  }
}

/**
 * Check if content topic is appropriate for a given age
 *
 * @param topic - The content topic to check
 * @param age - Student's age in years
 * @returns AgeGateResult with appropriateness and handling guidance
 *
 * @example
 * const result = checkAgeGate('social_romance', 8);
 * // Returns: { appropriate: false, sensitivity: 'blocked', handling: 'block', ... }
 */
export function checkAgeGate(topic: ContentTopic, age: number): AgeGateResult {
  const bracket = getAgeBracket(age);
  const sensitivity = TOPIC_MATRIX[topic]?.[bracket] ?? 'moderate';

  const result: AgeGateResult = {
    appropriate: sensitivity === 'safe' || sensitivity === 'moderate',
    sensitivity,
    handling: sensitivityToHandling(sensitivity),
    guidance: ADAPTATION_GUIDANCE[sensitivity],
  };

  // Add alternative suggestion for blocked content
  if (sensitivity === 'blocked' || sensitivity === 'restricted') {
    result.alternative = ALTERNATIVE_SUGGESTIONS[topic];
  }

  // Log for monitoring
  if (sensitivity !== 'safe') {
    logger.info('Age gate check', {
      topic,
      age,
      bracket,
      sensitivity,
      appropriate: result.appropriate,
    });
  }

  return result;
}
