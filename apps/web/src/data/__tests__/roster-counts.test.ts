/**
 * The tooling parses the roster files; the app imports them. If those two ever
 * disagree, `npm run roster:check` would happily bless a wrong number — which
 * is exactly the failure mode the roster work set out to remove.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ROSTER, TOTAL_CHARACTERS } from '@/data/roster';
import { getAllBuddies } from '@/data/buddy-profiles';
import { maestri } from '@/data/maestri';
import { getAllSupportTeachers } from '@/data/support-teachers';

import { readRosterCounts } from '../../../../../scripts/lib/roster-counts';

const REPO_ROOT = process.cwd();

describe('roster counts', () => {
  it('are derived from the real character data, never hardcoded', () => {
    expect(ROSTER).toEqual({
      maestri: maestri.length,
      coaches: getAllSupportTeachers().length,
      buddies: getAllBuddies().length,
    });
  });

  it('agree with what the sync script parses out of the same files', () => {
    // The script cannot import the app (it drags in the Next module graph and
    // hangs), so it re-derives the counts by reading the data files. This is
    // the seam where the two could silently diverge.
    expect(readRosterCounts(REPO_ROOT)).toEqual(ROSTER);
  });

  it('adds up to the total offered to a student', () => {
    expect(TOTAL_CHARACTERS).toBe(ROSTER.maestri + ROSTER.coaches + ROSTER.buddies);
  });
});

describe('the README enumerates every maestro it advertises', () => {
  it('lists as many names as the count it claims', () => {
    const readme = readFileSync(resolve(REPO_ROOT, 'README.md'), 'utf8');
    const line = readme.split('\n').find((l) => l.startsWith('**') && l.includes('Maestri:**'));
    expect(line, 'roster line not found in README').toBeDefined();

    const claimed = Number(/(\d+) Maestri/.exec(line ?? '')?.[1]);
    // Each entry is "Name (Subject)"; counting the subjects counts the names.
    const listed = (line ?? '').match(/\([^)]+\)/g)?.length ?? 0;

    expect(claimed).toBe(ROSTER.maestri);
    expect(listed).toBe(ROSTER.maestri);
  });
});
