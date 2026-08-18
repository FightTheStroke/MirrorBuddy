/**
 * Corpus loading for the Maestri knowledge base seeder.
 *
 * Owns the mapping from a knowledge-file slug to the maestro ID the chat
 * runtime actually uses, because the two are not always the same and the
 * retriever filters retrieved rows by the runtime ID.
 */

import * as fs from 'fs';
import * as path from 'path';
import { maestri } from '../../../apps/web/src/data/maestri/index';
import { chunkText } from '../../../apps/web/src/lib/rag/semantic-chunker';

export const DIDACTIC_DIR = path.join(__dirname, '../../../.tmp/didactic-content');

export const CHUNK_OPTIONS = { maxChunkSize: 500, overlap: 50 } as const;

/**
 * Knowledge files whose slug differs from the maestro ID served at runtime.
 *
 * `amici-miei-knowledge.ts` carries the Conte Mascetti persona, which
 * `apps/web/src/data/maestri/mascetti.ts` exposes as `id: 'mascetti'`.
 * Seeding under the file slug would store rows the retriever then discards,
 * because it matches `sourceId` against the runtime ID.
 */
const SLUG_TO_MAESTRO_ID: Record<string, string> = {
  'amici-miei': 'mascetti',
};

const MAESTRO_SUBJECTS: Record<string, string> = {
  'alex-pina': 'spanish',
  cassese: 'law',
  cervantes: 'spanish',
  chris: 'presentation',
  cicerone: 'latin',
  curie: 'chemistry',
  darwin: 'biology',
  erodoto: 'history',
  euclide: 'mathematics',
  feynman: 'physics',
  galileo: 'physics',
  goethe: 'german',
  humboldt: 'geography',
  ippocrate: 'health',
  leonardo: 'art',
  'levi-montalcini': 'biology',
  lovelace: 'computer-science',
  manzoni: 'italian-literature',
  mascetti: 'italian-culture',
  moliere: 'french',
  mozart: 'music',
  omero: 'greek-literature',
  shakespeare: 'english',
  simone: 'sports',
  smith: 'economics',
  socrate: 'philosophy',
};

export interface DidacticFile {
  /** Slug taken from the knowledge file name. */
  slug: string;
  /** Maestro ID the chat runtime uses — what `sourceId` must hold. */
  maestroId: string;
  subject: string;
  content: string;
}

/**
 * Resolve a knowledge-file slug to the maestro ID used at runtime, and refuse
 * anything the registry does not know. A slug that resolves to no maestro would
 * seed rows the retriever can never return, which is precisely the failure that
 * kept this corpus invisible before — so it fails the run instead of warning.
 */
export function resolveMaestroId(slug: string): string {
  const resolved = SLUG_TO_MAESTRO_ID[slug] ?? slug;
  if (!maestri.some((m) => m.id === resolved)) {
    const hint = SLUG_TO_MAESTRO_ID[slug]
      ? `alias "${slug}" -> "${resolved}" is stale`
      : `add an entry to SLUG_TO_MAESTRO_ID if the runtime ID differs`;
    throw new Error(
      `Knowledge slug "${slug}" resolves to "${resolved}", which is not a registered maestro; ${hint}.`,
    );
  }
  return resolved;
}

export function loadDidacticContent(filePath: string): DidacticFile | null {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const idMatch = raw.match(/export const maestroId\s*=\s*'([^']+)'/);
  const contentMatch = raw.match(/export const content\s*=\s*`([\s\S]*?)`;/);
  if (!idMatch || !contentMatch) return null;

  const slug = idMatch[1];
  const maestroId = resolveMaestroId(slug);
  return {
    slug,
    maestroId,
    subject: MAESTRO_SUBJECTS[maestroId] ?? maestroId,
    content: contentMatch[1].trim(),
  };
}

export function chunkDidactic(content: string): string[] {
  return chunkText(content, CHUNK_OPTIONS)
    .map((c) => c.content)
    .filter((c) => c.trim().length > 0);
}

/** IDs the chat runtime serves — the only valid values for `sourceId`. */
export function registeredMaestroIds(): string[] {
  return maestri.map((m) => m.id);
}
