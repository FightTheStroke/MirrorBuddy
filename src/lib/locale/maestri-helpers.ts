/**
 * Locale Maestri Helpers
 * Utilities for filtering and selecting language maestri
 */

import { getAllMaestri } from "@/data/maestri";
import type { MaestroFull } from "@/data/maestri";

/**
 * Language subjects that have corresponding maestri
 */
const LANGUAGE_SUBJECTS = [
  "italian",
  "english",
  "french",
  "german",
  "spanish",
] as const;

export type LanguageSubject = (typeof LANGUAGE_SUBJECTS)[number];

/**
 * Get all maestri that teach languages
 */
export function getLanguageMaestri(): MaestroFull[] {
  const allMaestri = getAllMaestri();
  return allMaestri.filter((maestro) =>
    LANGUAGE_SUBJECTS.includes(maestro.subject as LanguageSubject),
  );
}

/**
 * Get maestro display information for selectors
 */
export interface MaestroOption {
  id: string;
  displayName: string;
  subject: string;
  subjectLabel: string;
}

export function getLanguageMaestroOptions(): MaestroOption[] {
  const languageMaestri = getLanguageMaestri();

  const subjectLabels: Record<string, string> = {
    italian: "Italiano",
    english: "Inglese",
    french: "Francese",
    german: "Tedesco",
    spanish: "Spagnolo",
  };

  return languageMaestri.map((maestro) => ({
    id: maestro.id,
    displayName: maestro.displayName,
    subject: maestro.subject,
    subjectLabel: subjectLabels[maestro.subject] || maestro.subject,
  }));
}

/**
 * Validate if a maestro ID is a valid language maestro
 */
export function isValidLanguageMaestro(maestroId: string): boolean {
  const languageMaestri = getLanguageMaestri();
  return languageMaestri.some((maestro) => maestro.id === maestroId);
}
