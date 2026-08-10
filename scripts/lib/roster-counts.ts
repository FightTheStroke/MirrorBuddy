/**
 * Reads the roster head-count straight from the data files.
 *
 * `src/data/roster.ts` is the source of truth for the running app, but a plain
 * Node script cannot import it: that pulls in the whole Next module graph and
 * hangs. Parsing the same files keeps the tooling fast and dependency-free.
 *
 * The two are prevented from drifting apart by `roster-counts.test.ts`, which
 * asserts this parser agrees with the real imported roster.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface RosterCounts {
  maestri: number;
  coaches: number;
  buddies: number;
}

const DATA_DIR = ['apps', 'web', 'src', 'data'];

function read(repoRoot: string, ...parts: string[]): string {
  return readFileSync(join(repoRoot, ...DATA_DIR, ...parts), 'utf8');
}

/** Count the entries of `export const maestri: MaestroFull[] = [ ... ]`. */
function countMaestri(source: string): number {
  const match = source.match(/export const maestri:[^=]*=\s*\[([\s\S]*?)\]/);
  if (!match) throw new Error('could not find the maestri array in data/maestri/index.ts');
  return match[1]
    .split(',')
    .map((entry) => entry.replace(/\/\/.*$/gm, '').trim())
    .filter(Boolean).length;
}

/** Count the members of an id union such as `export type BuddyId = "a" | "b"`. */
function countIdUnion(source: string, typeName: string): number {
  const match = source.match(new RegExp(`export type ${typeName}\\s*=([^;]*);`));
  if (!match) throw new Error(`could not find the ${typeName} union`);
  return (match[1].match(/"[^"]+"|'[^']+'/g) ?? []).length;
}

export function readRosterCounts(repoRoot: string): RosterCounts {
  return {
    maestri: countMaestri(read(repoRoot, 'maestri', 'index.ts')),
    coaches: countIdUnion(read(repoRoot, 'support-teachers', 'support-teachers.ts'), 'CoachId'),
    buddies: countIdUnion(read(repoRoot, 'buddy-profiles', 'buddy-profiles.ts'), 'BuddyId'),
  };
}
