/**
 * Character routing constants and mappings.
 */

import type { Subject } from '@/types';

/**
 * Default Maestro IDs for each subject.
 * These are the "primary" Maestri for each subject.
 */
export const DEFAULT_MAESTRO_BY_SUBJECT: Record<Subject, string> = {
  mathematics: 'euclide-matematica',
  physics: 'feynman-fisica',
  chemistry: 'curie-chimica',
  biology: 'darwin-biologia', // Fallback will find actual maestro if exists
  history: 'erodoto-storia',
  geography: 'humboldt-geografia',
  italian: 'manzoni-italiano',
  english: 'shakespeare-inglese',
  art: 'leonardo-arte',
  music: 'mozart-musica',
  civics: 'montessori-civica', // Fallback will find actual maestro if exists
  economics: 'smith-economia',
  computerScience: 'turing-informatica', // Fallback will find actual maestro if exists
  health: 'ippocrate-salute', // Fallback will find actual maestro if exists
  philosophy: 'socrate-filosofia',
  internationalLaw: 'grozio-diritto', // Fallback will find actual maestro if exists
  spanish: 'alex-pina-spagnolo',
  storytelling: 'chris-storytelling',
  supercazzola: 'mascetti-supercazzola',
};
