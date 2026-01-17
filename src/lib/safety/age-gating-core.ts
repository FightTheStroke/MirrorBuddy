/**
 * MirrorBuddy Age Gating Module - Core Logic
 * Ensures content is appropriate for the student's age group
 *
 * This module provides:
 * - Age-appropriate content filtering
 * - Topic restrictions by age bracket
 * - Language complexity adaptation
 * - Sensitive topic handling based on developmental stage
 *
 * Related: #30 Safety Guardrails Issue
 */

import { logger } from '@/lib/logger';
import {
  TOPIC_MATRIX,
  ADAPTATION_GUIDANCE,
  ALTERNATIVE_SUGGESTIONS,
} from './age-gating-matrix';
import type {
  AgeBracket,
  TopicSensitivity,
  ContentTopic,
  AgeGateResult,
} from './age-gating-types';

// Re-export types for backward compatibility
export type {
  AgeBracket,
  TopicSensitivity,
  ContentTopic,
  AgeGateResult,
} from './age-gating-types';

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
 * Check if content topic is appropriate for a given age
 *
 * @param topic - The content topic to check
 * @param age - Student's age in years
 * @returns AgeGateResult with appropriateness and handling guidance
 *
 * @example
 * ```typescript
 * const result = checkAgeGate('social_romance', 8);
 * // Returns: { appropriate: false, sensitivity: 'blocked', handling: 'block', ... }
 * ```
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

/**
 * Map sensitivity level to handling action
 */
function sensitivityToHandling(
  sensitivity: TopicSensitivity
): AgeGateResult['handling'] {
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
    history_violence: [
      /olocausto/i,
      /holocaust/i,
      /schiavitù/i,
      /slavery/i,
      /genocid/i,
    ],
    biology_reproduction: [
      /riproduzione/i,
      /pubertà/i,
      /sesso biologico/i,
      /mestruazion/i,
    ],
    health_mental: [
      /ansia/i,
      /depression/i,
      /salute mentale/i,
      /disturb/i,
    ],
    health_physical: [/malatti/i, /igiene/i, /nutrizione/i, /esercizio/i],
    social_relationships: [
      /amicizi/i,
      /compagni/i,
      /litig/i,
      /bullismo/i,
    ],
    social_romance: [
      /fidanzat/i,
      /innamorat/i,
      /ragazzo\/a/i,
      /relazione amorosa/i,
    ],
    current_events: [/notizie/i, /politic/i, /election/i, /attualità/i],
    philosophy_ethics: [
      /etica/i,
      /morale/i,
      /giusto o sbagliato/i,
      /dilemma/i,
    ],
    literature_mature: [
      /romanzo adulto/i,
      /temi maturi/i,
      /contenuti per adulti/i,
    ],
    economics_finance: [
      /economia/i,
      /soldi/i,
      /finanza/i,
      /risparmio/i,
      /investiment/i,
    ],
  };

  for (const [topic, patterns] of Object.entries(topicPatterns)) {
    if (patterns.some((pattern) => pattern.test(lowerText))) {
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
  const results = topics.map((topic) => checkAgeGate(topic, age));

  // Return the most restrictive result
  const mostRestrictive = results.reduce((worst, current) => {
    const severityOrder: TopicSensitivity[] = [
      'safe',
      'moderate',
      'restricted',
      'blocked',
    ];
    const currentIndex = severityOrder.indexOf(current.sensitivity);
    const worstIndex = severityOrder.indexOf(worst.sensitivity);
    return currentIndex > worstIndex ? current : worst;
  }, results[0]);

  return mostRestrictive;
}

/**
 * Get language complexity guidance for age
 * Helps AI adapt vocabulary and sentence structure
 */
export function getLanguageGuidance(age: number): string {
  const bracket = getAgeBracket(age);

  switch (bracket) {
    case 'elementary':
      return `
ADATTAMENTO LINGUISTICO (6-10 anni):
- Usa frasi brevi e semplici (max 10-15 parole)
- Evita parole difficili, spiega i termini nuovi
- Usa esempi concreti e visivi
- Tono amichevole e incoraggiante
- Molte ripetizioni per rafforzare concetti
`;
    case 'middle':
      return `
ADATTAMENTO LINGUISTICO (11-13 anni):
- Frasi di media lunghezza
- Introduci gradualmente vocabolario più avanzato
- Usa analogie e metafore semplici
- Tono rispettoso ma non infantile
- Incoraggia il ragionamento critico
`;
    case 'highschool':
      return `
ADATTAMENTO LINGUISTICO (14-19 anni):
- Linguaggio standard, vocabolario completo
- Riferimenti culturali appropriati
- Stimola l'analisi critica
- Rispetta la maturità cognitiva
- Evita tono paternalistico
`;
    case 'adult':
    default:
      return `
ADATTAMENTO LINGUISTICO (adulti):
- Linguaggio professionale e completo
- Nessuna semplificazione necessaria
- Discussione approfondita consentita
`;
  }
}

/**
 * Get age-appropriate system prompt addendum
 * Combine with character system prompts
 */
export function getAgeGatePrompt(age: number): string {
  const bracket = getAgeBracket(age);
  const languageGuidance = getLanguageGuidance(age);

  return `
# ADATTAMENTO PER ETÀ: ${age} ANNI (${bracket.toUpperCase()})

${languageGuidance}

## ARGOMENTI SENSIBILI PER QUESTA ETÀ
${getTopicRestrictionsForBracket(bracket)}

RICORDA: Adatta SEMPRE il tuo linguaggio e contenuto all'età dello studente.
`;
}

/**
 * Get topic restrictions summary for an age bracket
 */
function getTopicRestrictionsForBracket(bracket: AgeBracket): string {
  const restrictions: string[] = [];

  for (const [topic, matrix] of Object.entries(TOPIC_MATRIX)) {
    const sensitivity = matrix[bracket];
    if (sensitivity === 'blocked' || sensitivity === 'restricted') {
      restrictions.push(
        `- ${topic.replace(/_/g, ' ')}: ${sensitivity.toUpperCase()}`
      );
    }
  }

  if (restrictions.length === 0) {
    return "Nessuna restrizione speciale per questa fascia d'età.";
  }

  return restrictions.join('\n');
}
