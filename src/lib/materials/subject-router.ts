// ============================================================================
// SUBJECT ROUTER
// Maps subjects to the most appropriate Maestro
// Related: T-17 Subject→Maestro routing, Issue #19
// ============================================================================

import type { Subject } from '@/types';

/**
 * Mapping from subject keywords to Maestro IDs
 * Supports both Italian and English terms
 */
const SUBJECT_MAESTRO_MAP: Record<string, string> = {
  // Mathematics - Pitagora (numbers, algebra)
  matematica: 'pitagora',
  math: 'pitagora',
  mathematics: 'pitagora',
  algebra: 'pitagora',
  aritmetica: 'pitagora',
  arithmetic: 'pitagora',
  equazioni: 'pitagora',
  equations: 'pitagora',
  numeri: 'pitagora',
  numbers: 'pitagora',

  // Geometry - Archimede
  geometria: 'archimede',
  geometry: 'archimede',
  forme: 'archimede',
  shapes: 'archimede',
  trigonometria: 'archimede',
  trigonometry: 'archimede',

  // Biology - Da Vinci
  biologia: 'da-vinci',
  biology: 'da-vinci',
  natura: 'da-vinci',
  nature: 'da-vinci',
  anatomia: 'da-vinci',
  anatomy: 'da-vinci',

  // Physics - Galileo
  fisica: 'galileo',
  physics: 'galileo',
  meccanica: 'galileo',
  mechanics: 'galileo',
  astronomia: 'galileo',
  astronomy: 'galileo',
  movimento: 'galileo',
  motion: 'galileo',

  // Italian Literature - Dante
  italiano: 'dante',
  italian: 'dante',
  letteratura: 'dante',
  literature: 'dante',
  poesia: 'dante',
  poetry: 'dante',
  grammatica: 'dante',
  grammar: 'dante',

  // History - Cesare
  storia: 'cesare',
  history: 'cesare',
  roma: 'cesare',
  rome: 'cesare',
  imperatori: 'cesare',
  emperors: 'cesare',

  // Geography - Marco Polo
  geografia: 'marco-polo',
  geography: 'marco-polo',
  mappe: 'marco-polo',
  maps: 'marco-polo',
  viaggi: 'marco-polo',
  travels: 'marco-polo',
  esplorazioni: 'marco-polo',
  exploration: 'marco-polo',

  // Art - Michelangelo
  arte: 'michelangelo',
  art: 'michelangelo',
  scultura: 'michelangelo',
  sculpture: 'michelangelo',
  pittura: 'michelangelo',
  painting: 'michelangelo',
  disegno: 'michelangelo',
  drawing: 'michelangelo',

  // Music - Mozart
  musica: 'mozart',
  music: 'mozart',
  composizione: 'mozart',
  composition: 'mozart',
  melodia: 'mozart',
  melody: 'mozart',
  sinfonia: 'mozart',
  symphony: 'mozart',

  // Philosophy - Socrate
  filosofia: 'socrate',
  philosophy: 'socrate',
  etica: 'socrate',
  ethics: 'socrate',
  logica: 'socrate',
  logic: 'socrate',
  pensiero: 'socrate',
  thinking: 'socrate',

  // English - Shakespeare
  inglese: 'shakespeare',
  english: 'shakespeare',

  // Chemistry - Marie Curie
  chimica: 'marie-curie',
  chemistry: 'marie-curie',
  elementi: 'marie-curie',
  elements: 'marie-curie',
  reazioni: 'marie-curie',
  reactions: 'marie-curie',

  // Computer Science - Ada Lovelace
  informatica: 'ada-lovelace',
  computing: 'ada-lovelace',
  programmazione: 'ada-lovelace',
  programming: 'ada-lovelace',
  computer: 'ada-lovelace',

  // Economics
  economia: 'ada-lovelace',
  economics: 'ada-lovelace',

  // Civics
  civica: 'cesare',
  civics: 'cesare',
  educazionecivica: 'cesare',
};

/**
 * Type system Subject to Maestro mapping
 */
const TYPED_SUBJECT_MAP: Record<Subject, string> = {
  mathematics: 'pitagora',
  physics: 'galileo',
  chemistry: 'marie-curie',
  biology: 'da-vinci',
  history: 'cesare',
  geography: 'marco-polo',
  italian: 'dante',
  english: 'shakespeare',
  art: 'michelangelo',
  music: 'mozart',
  civics: 'cesare',
  economics: 'ada-lovelace',
  computerScience: 'ada-lovelace',
  health: 'da-vinci',
  philosophy: 'socrate',
  internationalLaw: 'cesare',
  spanish: 'alex-pina',
  storytelling: 'chris',
};

/**
 * Get the best Maestro ID for a given subject string
 * @param subject - Subject keyword (e.g., "matematica", "physics")
 * @returns Maestro ID or null if no match found
 */
export function getMaestroForSubject(subject: string): string | null {
  const normalized = subject.toLowerCase().trim();
  return SUBJECT_MAESTRO_MAP[normalized] || null;
}

/**
 * Get Maestro ID for a typed Subject enum value
 * @param subject - Subject enum value from @/types
 * @returns Maestro ID (always returns a valid ID)
 */
export function getMaestroForTypedSubject(subject: Subject): string {
  return TYPED_SUBJECT_MAP[subject] || 'da-vinci';
}

/**
 * Get all supported subject keywords
 */
export function getAllSubjectKeywords(): string[] {
  return [...new Set(Object.keys(SUBJECT_MAESTRO_MAP))];
}

/**
 * Detect subject from text content (e.g., homework description)
 * Uses simple keyword matching - can be enhanced with AI later
 * @param text - Text to analyze
 * @returns Subject enum value
 */
export function detectSubjectFromText(text: string): Subject {
  const normalized = text.toLowerCase();

  // Check each subject keyword
  for (const [keyword, maestroId] of Object.entries(SUBJECT_MAESTRO_MAP)) {
    if (normalized.includes(keyword)) {
      // Map maestro back to subject
      const subjectMap: Record<string, Subject> = {
        pitagora: 'mathematics',
        archimede: 'mathematics',
        'da-vinci': 'biology',
        galileo: 'physics',
        dante: 'italian',
        cesare: 'history',
        'marco-polo': 'geography',
        michelangelo: 'art',
        mozart: 'music',
        socrate: 'philosophy',
        shakespeare: 'english',
        'marie-curie': 'chemistry',
        'ada-lovelace': 'computerScience',
      };
      return subjectMap[maestroId] || 'mathematics';
    }
  }

  return 'mathematics'; // Default
}

/**
 * Get all Maestros for a given typed subject
 * Some subjects have multiple experts
 */
export function getMaestrosForSubject(subject: Subject): string[] {
  const primary = TYPED_SUBJECT_MAP[subject];

  // Additional experts per subject
  const additionalExperts: Partial<Record<Subject, string[]>> = {
    mathematics: ['pitagora', 'archimede'],
    biology: ['da-vinci'],
    physics: ['galileo'],
    chemistry: ['marie-curie'],
    philosophy: ['socrate'],
    art: ['michelangelo', 'da-vinci'],
  };

  return additionalExperts[subject] || [primary];
}
