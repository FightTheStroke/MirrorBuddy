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
