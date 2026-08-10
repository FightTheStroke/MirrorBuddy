/**
 * Single source of truth for "how many characters does MirrorBuddy have".
 *
 * Adding Loto as the 27th maestro silently invalidated 61 translated strings,
 * a handful of docs, the robot package and — worst of all — the EU AI Act
 * Article 50 disclosure, because every one of those places had the number
 * typed in by hand. Nothing derived the count from the roster itself.
 *
 * Every count here is computed from the actual character data, so it cannot
 * disagree with reality. Anything that needs to state a number must read it
 * from here (in code) or be kept honest by `scripts/sync-roster-counts.ts`
 * (in translations, docs and the robot package).
 */
import { getAllBuddies } from './buddy-profiles';
import { maestri } from './maestri';
import { getAllSupportTeachers } from './support-teachers';

export const ROSTER = {
  /** AI professors ("Maestri"). */
  maestri: maestri.length,
  /** Support teachers, presented to families as "Coach". */
  coaches: getAllSupportTeachers().length,
  /** Peer buddies. */
  buddies: getAllBuddies().length,
} as const;

/** Every character a student can talk to, across all three rosters. */
export const TOTAL_CHARACTERS = ROSTER.maestri + ROSTER.coaches + ROSTER.buddies;

export type RosterKey = keyof typeof ROSTER;

/**
 * The actual ids, for the places that need the roster itself rather than its
 * size. The Pro tier is the obvious one: it grants everything, so a
 * hand-maintained copy of the list in the seed can only ever drift.
 *
 * The literals live in `./roster-ids` and are re-exported here, so app code has
 * one place to import from. They are kept honest by `roster-ids.test.ts`. The
 * split exists because the database seed must not import the character data —
 * see the comment in that file.
 */
export { ROSTER_IDS } from './roster-ids';
