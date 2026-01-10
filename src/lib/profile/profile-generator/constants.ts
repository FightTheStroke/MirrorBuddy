/**
 * Constants for Profile Generator
 */

import type { ObservationCategory, ProfileGenerationOptions } from './types';

/**
 * Default options for profile generation.
 */
export const DEFAULT_OPTIONS: Required<ProfileGenerationOptions> = {
  maxInsights: 100,
  minConfidence: 0.6,
  includeSynthesis: true,
};

/**
 * Category priority for strategy generation.
 */
export const CATEGORY_PRIORITY: Record<ObservationCategory, number> = {
  logical_reasoning: 10,
  mathematical_intuition: 9,
  critical_thinking: 9,
  study_method: 10,
  verbal_expression: 8,
  linguistic_ability: 8,
  creativity: 7,
  artistic_sensitivity: 7,
  scientific_curiosity: 8,
  experimental_approach: 7,
  spatial_memory: 6,
  historical_understanding: 6,
  philosophical_depth: 7,
  physical_awareness: 5,
  environmental_awareness: 5,
  narrative_skill: 7,
  collaborative_spirit: 6,
};

/**
 * Strategy suggestions for each observation category.
 */
export const STRATEGY_TEMPLATES: Record<ObservationCategory, string[]> = {
  logical_reasoning: [
    'Esercizi di problem-solving con difficolta progressiva',
    'Giochi di logica e puzzle matematici',
    'Sfide che richiedono ragionamento step-by-step',
  ],
  mathematical_intuition: [
    'Manipolazione di oggetti concreti per visualizzare concetti',
    'Connessioni tra matematica e situazioni quotidiane',
    'Pattern recognition attraverso giochi e attivita ludiche',
  ],
  critical_thinking: [
    'Discussioni guidate su temi controversi',
    'Analisi di fonti multiple sullo stesso argomento',
    'Esercizi di argomentazione e debate',
  ],
  study_method: [
    'Tecniche di time-boxing e pomodoro',
    'Mappe mentali per organizzare le informazioni',
    'Flashcard e spaced repetition',
  ],
  verbal_expression: [
    'Esercizi di public speaking e presentazioni',
    'Discussioni guidate su argomenti di interesse',
    'Giochi di ruolo e simulazioni',
  ],
  linguistic_ability: [
    'Lettura ad alta voce con feedback',
    'Esercizi di scrittura creativa',
    'Giochi linguistici e wordplay',
  ],
  creativity: [
    'Progetti artistici e creativi',
    'Brainstorming e mind mapping',
    'Esplorazione di soluzioni alternative',
  ],
  artistic_sensitivity: [
    'Analisi di opere d\'arte e musica',
    'Progetti creativi multidisciplinari',
    'Collegamenti tra arte e altre materie',
  ],
  scientific_curiosity: [
    'Esperimenti pratici e hands-on',
    'Esplorazione di fenomeni quotidiani',
    'Domande aperte e investigazioni',
  ],
  experimental_approach: [
    'Metodo scientifico applicato a problemi reali',
    'Raccolta e analisi dati',
    'Sperimentazione guidata',
  ],
  spatial_memory: [
    'Mappe mentali e visualizzazioni',
    'Esercizi di orientamento spaziale',
    'Diagrammi e schemi grafici',
  ],
  historical_understanding: [
    'Timeline interattive e cronologie',
    'Connessioni tra eventi storici',
    'Analisi di cause ed effetti',
  ],
  philosophical_depth: [
    'Discussioni su questioni etiche',
    'Analisi di argomenti filosofici',
    'Riflessione critica su valori e principi',
  ],
  physical_awareness: [
    'Attivita motorie integrate nello studio',
    'Breaks attivi durante le sessioni',
    'Esercizi di mindfulness e consapevolezza corporea',
  ],
  environmental_awareness: [
    'Progetti di sostenibilita',
    'Esplorazione della natura',
    'Collegamenti tra ambiente e apprendimento',
  ],
  narrative_skill: [
    'Storytelling e narrazione creativa',
    'Analisi di strutture narrative',
    'Scrittura di storie e racconti',
  ],
  collaborative_spirit: [
    'Progetti di gruppo e collaborazione',
    'Peer learning e tutoring',
    'Attivita di team building',
  ],
};
