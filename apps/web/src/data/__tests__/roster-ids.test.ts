/**
 * Binds the seed-safe id literals to the real character data.
 *
 * `roster-ids.ts` cannot import the characters (it would hang `prisma db seed`,
 * see the comment there), so nothing in the type system stops the two from
 * drifting. This test is that guarantee: add, remove or rename a character and
 * it fails here, naming exactly what moved.
 */
import { describe, expect, it } from 'vitest';

import { getAllBuddies } from '../buddy-profiles';
import { maestri } from '../maestri';
import { ROSTER } from '../roster';
import { ROSTER_IDS } from '../roster-ids';
import { getAllSupportTeachers } from '../support-teachers';

describe('ROSTER_IDS', () => {
  it('lists exactly the maestri that exist', () => {
    expect([...ROSTER_IDS.maestri].sort()).toEqual(maestri.map((m) => m.id).sort());
  });

  it('lists exactly the coaches that exist', () => {
    expect([...ROSTER_IDS.coaches].sort()).toEqual(
      getAllSupportTeachers()
        .map((c) => c.id)
        .sort(),
    );
  });

  it('lists exactly the buddies that exist', () => {
    expect([...ROSTER_IDS.buddies].sort()).toEqual(
      getAllBuddies()
        .map((b) => b.id)
        .sort(),
    );
  });

  it('agrees with the counts the rest of the app is generated from', () => {
    expect(ROSTER_IDS.maestri.length).toBe(ROSTER.maestri);
    expect(ROSTER_IDS.coaches.length).toBe(ROSTER.coaches);
    expect(ROSTER_IDS.buddies.length).toBe(ROSTER.buddies);
  });

  it('contains no duplicates', () => {
    for (const [group, ids] of Object.entries(ROSTER_IDS)) {
      expect(new Set(ids).size, `${group} has a repeated id`).toBe(ids.length);
    }
  });
});
