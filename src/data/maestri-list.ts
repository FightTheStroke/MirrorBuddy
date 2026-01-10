/**
 * Maestri List - Helper Functions and Barrel Export
 * Re-exports maestri data and provides utility functions
 */

import type { Maestro, Subject } from '@/types';
import {
  MAESTRI_SCIENCE_ARTS,
  MAESTRI_HUMANITIES,
  MAESTRI_SOCIETY,
  MAESTRI_TECH_HEALTH,
} from './maestri-data';

export const maestri: Maestro[] = [
  ...MAESTRI_SCIENCE_ARTS,
  ...MAESTRI_HUMANITIES,
  ...MAESTRI_SOCIETY,
  ...MAESTRI_TECH_HEALTH,
];

export function getMaestroById(id: string): Maestro | undefined {
  return maestri.find(m => m.id === id);
}

export function getMaestriBySubject(subject: Subject): Maestro[] {
  return maestri.filter(m => m.subject === subject);
}

export function getAllSubjects(): Subject[] {
  return Array.from(new Set(maestri.map(m => m.subject))).sort() as Subject[];
}
