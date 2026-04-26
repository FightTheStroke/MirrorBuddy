/**
 * Character routing constants and mappings.
 */

import type { Subject } from "@/types";

/**
 * Default Maestro IDs for each subject.
 * These are the "primary" Maestri for each subject.
 */
export const DEFAULT_MAESTRO_BY_SUBJECT: Record<Subject, string> = {
  mathematics: "euclide",
  physics: "feynman",
  chemistry: "curie",
  biology: "darwin",
  history: "erodoto",
  geography: "humboldt",
  italian: "manzoni",
  english: "shakespeare",
  art: "leonardo",
  music: "mozart",
  civics: "cicerone",
  economics: "smith",
  computerScience: "lovelace",
  health: "ippocrate",
  philosophy: "socrate",
  internationalLaw: "cassese",
  french: "moliere",
  german: "goethe",
  spanish: "alex-pina",
  storytelling: "chris",
  supercazzola: "mascetti",
  sport: "simone",
};
