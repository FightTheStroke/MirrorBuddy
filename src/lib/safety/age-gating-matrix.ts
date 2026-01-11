/**
 * Age Gating Configuration Matrix
 * Topic appropriateness by age bracket and guidance
 */

import type { ContentTopic, AgeBracket, TopicSensitivity } from './age-gating-core';

/**
 * Topic restrictions by age bracket
 * Defines what's appropriate at each developmental stage
 */
export const TOPIC_MATRIX: Record<
  ContentTopic,
  Record<AgeBracket, TopicSensitivity>
> = {
  basic_education: {
    elementary: 'safe',
    middle: 'safe',
    highschool: 'safe',
    adult: 'safe',
  },
  history_war: {
    elementary: 'moderate', // Simplified, no graphic details
    middle: 'moderate',
    highschool: 'safe',
    adult: 'safe',
  },
  history_violence: {
    elementary: 'restricted', // Very limited, focus on peace/hope
    middle: 'moderate', // Age-appropriate education
    highschool: 'safe',
    adult: 'safe',
  },
  biology_reproduction: {
    elementary: 'restricted', // Only if age-appropriate (10+)
    middle: 'moderate', // Factual, educational
    highschool: 'safe',
    adult: 'safe',
  },
  health_mental: {
    elementary: 'moderate', // Simplified, focus on feelings
    middle: 'safe',
    highschool: 'safe',
    adult: 'safe',
  },
  health_physical: {
    elementary: 'safe',
    middle: 'safe',
    highschool: 'safe',
    adult: 'safe',
  },
  social_relationships: {
    elementary: 'safe',
    middle: 'safe',
    highschool: 'safe',
    adult: 'safe',
  },
  social_romance: {
    elementary: 'blocked', // Not appropriate for elementary
    middle: 'moderate', // Age-appropriate, no explicit content
    highschool: 'safe',
    adult: 'safe',
  },
  current_events: {
    elementary: 'restricted', // Very selective, no disturbing news
    middle: 'moderate',
    highschool: 'safe',
    adult: 'safe',
  },
  philosophy_ethics: {
    elementary: 'moderate', // Simple dilemmas
    middle: 'safe',
    highschool: 'safe',
    adult: 'safe',
  },
  literature_mature: {
    elementary: 'blocked',
    middle: 'restricted',
    highschool: 'moderate',
    adult: 'safe',
  },
  economics_finance: {
    elementary: 'moderate', // Basic concepts (saving, spending)
    middle: 'safe',
    highschool: 'safe',
    adult: 'safe',
  },
};

/**
 * Guidance messages for content adaptation by sensitivity level
 */
export const ADAPTATION_GUIDANCE: Record<TopicSensitivity, string> = {
  safe: 'Contenuto appropriato. Nessun adattamento necessario.',
  moderate:
    'Usa un linguaggio semplificato e evita dettagli grafici. Mantieni un tono rassicurante.',
  restricted:
    "Tratta l'argomento solo se strettamente necessario per il curriculum. Semplifica al massimo e focalizzati su aspetti positivi.",
  blocked:
    "Questo argomento non è appropriato per questa fascia d'età. Suggerisci un'alternativa.",
};

/**
 * Alternative topic suggestions for blocked content
 */
export const ALTERNATIVE_SUGGESTIONS: Partial<Record<ContentTopic, string>> =
  {
    social_romance:
      'Parliamo invece di amicizia e relazioni positive tra coetanei!',
    literature_mature:
      'Ci sono molti libri avventurosi adatti alla tua età. Vuoi qualche consiglio?',
    history_violence:
      'Possiamo esplorare storie di eroi e persone che hanno fatto la differenza per il bene.',
    current_events: 'Parliamo di notizie positive e scoperte interessanti!',
  };
