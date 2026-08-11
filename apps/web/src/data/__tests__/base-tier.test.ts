/**
 * The Base tier is a subset of the roster, so nothing derives it and nothing
 * would notice if it quietly stopped making sense. These are the properties
 * that actually matter to a free student.
 */
import { describe, expect, it } from 'vitest';

import { maestri } from '../maestri';
import { BASE_TIER_MAESTRI, ROSTER_IDS } from '../roster-ids';

const BASE_TIER_SIZE = 20;

describe('BASE_TIER_MAESTRI', () => {
  it(`grants exactly ${BASE_TIER_SIZE} maestri`, () => {
    expect(BASE_TIER_MAESTRI.length).toBe(BASE_TIER_SIZE);
  });

  it('names only maestri that exist', () => {
    const known = new Set<string>(ROSTER_IDS.maestri);
    for (const id of BASE_TIER_MAESTRI) {
      expect(known.has(id), `Base grants "${id}", who is not in the roster`).toBe(true);
    }
  });

  it('lists no one twice', () => {
    expect(new Set(BASE_TIER_MAESTRI).size).toBe(BASE_TIER_MAESTRI.length);
  });

  it('leaves no school subject without a teacher', () => {
    // Deliberately Pro-only: enrichment rather than curriculum. A free student
    // is never left without a teacher for something they are graded on.
    const PRO_ONLY_SUBJECTS = ['storytelling', 'sport', 'internationalLaw', 'supercazzola'];

    const included = new Set<string>(BASE_TIER_MAESTRI);
    const covered = new Set(maestri.filter((m) => included.has(m.id)).map((m) => m.subject));

    const uncovered = [...new Set(maestri.map((m) => m.subject))].filter(
      (subject) => !covered.has(subject) && !PRO_ONLY_SUBJECTS.includes(subject),
    );

    // This fails on a *new* subject too, which is the point: adding one forces
    // the choice of whether free students get it, instead of defaulting to no.
    expect(
      uncovered,
      `Base leaves these subjects with no teacher: ${uncovered.join(', ')}`,
    ).toEqual([]);
  });

  it('is a real subset, so upgrading to Pro still adds something', () => {
    expect(BASE_TIER_MAESTRI.length).toBeLessThan(ROSTER_IDS.maestri.length);
  });
});
