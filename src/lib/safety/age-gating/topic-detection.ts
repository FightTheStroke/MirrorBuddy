// ============================================================================
// AGE GATING TOPIC DETECTION
// Topic detection from text content
// ============================================================================

import type { ContentTopic, AgeGateResult } from './types';
import { checkAgeGate } from './core';

/**
 * Detect topic from text content
 * Uses keyword matching for topic detection
 *
 * @param text - Text to analyze
 * @returns Array of detected topics
 */
export function detectTopics(text: string): ContentTopic[] {
  const lowerText = text.toLowerCase();
  const detected: ContentTopic[] = [];

  const topicPatterns: Record<ContentTopic, RegExp[]> = {
    basic_education: [/matematic/i, /lettura/i, /scrittura/i, /scienz/i],
    history_war: [/guerra/i, /battaglia/i, /conflitto/i, /world war/i],
    history_violence: [/olocausto/i, /holocaust/i, /schiavitù/i, /slavery/i, /genocid/i],
    biology_reproduction: [/riproduzione/i, /pubertà/i, /sesso biologico/i, /mestruazion/i],
    health_mental: [/ansia/i, /depression/i, /salute mentale/i, /disturb/i],
    health_physical: [/malatti/i, /igiene/i, /nutrizione/i, /esercizio/i],
    social_relationships: [/amicizi/i, /compagni/i, /litig/i, /bullismo/i],
    social_romance: [/fidanzat/i, /innamorat/i, /ragazzo\/a/i, /relazione amorosa/i],
    current_events: [/notizie/i, /politic/i, /election/i, /attualità/i],
    philosophy_ethics: [/etica/i, /morale/i, /giusto o sbagliato/i, /dilemma/i],
    literature_mature: [/romanzo adulto/i, /temi maturi/i, /contenuti per adulti/i],
    economics_finance: [/economia/i, /soldi/i, /finanza/i, /risparmio/i, /investiment/i],
  };

  for (const [topic, patterns] of Object.entries(topicPatterns)) {
    if (patterns.some(pattern => pattern.test(lowerText))) {
      detected.push(topic as ContentTopic);
    }
  }

  // Default to basic education if no topics detected
  if (detected.length === 0) {
    detected.push('basic_education');
  }

  return detected;
}

/**
 * Filter content for age appropriateness
 * Main function to call before generating AI response
 *
 * @param text - Input text to analyze
 * @param age - Student's age
 * @returns Combined age gate result for all detected topics
 */
export function filterForAge(text: string, age: number): AgeGateResult {
  const topics = detectTopics(text);
  const results = topics.map(topic => checkAgeGate(topic, age));

  // Return the most restrictive result
  const mostRestrictive = results.reduce((worst, current) => {
    const severityOrder = ['safe', 'moderate', 'restricted', 'blocked'] as const;
    const currentIndex = severityOrder.indexOf(current.sensitivity);
    const worstIndex = severityOrder.indexOf(worst.sensitivity);
    return currentIndex > worstIndex ? current : worst;
  }, results[0]);

  return mostRestrictive;
}
