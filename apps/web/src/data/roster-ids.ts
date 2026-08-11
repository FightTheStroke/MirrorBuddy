/**
 * The roster ids, as plain literals with no imports.
 *
 * This file exists so that `prisma db seed` can know which characters exist
 * without importing the character data. Importing `./roster` pulls in the
 * whole maestri/coach/buddy module graph, and under `tsx` that never lets the
 * process exit: the seed finishes its work, prints success, and then hangs
 * forever. In CI that stalls the "Setup database" step and every job that
 * depends on it, with no error to read — it just never ends.
 *
 * Keeping the literals here is not a second source of truth: it is a copy that
 * cannot silently diverge, because `roster-ids.test.ts` compares it against the
 * real character data and fails if a character is added, removed or renamed.
 * Same trade already made in `scripts/lib/roster-counts.ts`, for the same
 * reason.
 */
export const ROSTER_IDS = {
  maestri: [
    'leonardo',
    'loto',
    'galileo',
    'curie',
    'cicerone',
    'lovelace',
    'turing',
    'noether',
    'austen',
    'smith',
    'shakespeare',
    'humboldt',
    'erodoto',
    'manzoni',
    'euclide',
    'mozart',
    'socrate',
    'ippocrate',
    'feynman',
    'darwin',
    'chris',
    'omero',
    'alex-pina',
    'mascetti',
    'simone',
    'cassese',
    'moliere',
    'goethe',
    'cervantes',
    'levi-montalcini',
  ],
  coaches: ['melissa', 'roberto', 'chiara', 'andrea', 'favij', 'laura'],
  buddies: ['mario', 'noemi', 'enea', 'bruno', 'sofia', 'marta'],
} as const;

/**
 * The maestri included in the free Base tier.
 *
 * Base is a subset, so it is chosen rather than derived — but it is chosen on a
 * rule, not by truncating a list: **every school subject stays covered**. Where
 * two maestri teach the same subject, Base gets one of them and the other
 * becomes a reason to upgrade. That way a free student is never left without a
 * teacher for something they actually study.
 *
 * `base-tier.test.ts` enforces exactly that: it fails if the list changes size,
 * names a maestro who does not exist, or drops a subject to zero teachers.
 */
export const BASE_TIER_MAESTRI = [
  'leonardo', // art
  'galileo', // physics
  'curie', // chemistry
  'cicerone', // civics
  'lovelace', // computer science
  'turing', // computer science
  'smith', // economics
  'shakespeare', // english
  'humboldt', // geography
  'erodoto', // history
  'manzoni', // italian
  'euclide', // mathematics
  'mozart', // music
  'socrate', // philosophy
  'ippocrate', // health
  'levi-montalcini', // biology
  'cervantes', // spanish
  'moliere', // french
  'goethe', // german
  'loto', // mindfulness
] as const;
