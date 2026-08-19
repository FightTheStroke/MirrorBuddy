import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  chunkDidactic,
  registeredMaestroIds,
  resolveMaestroId,
} from '../../../../../../scripts/lib/maestri-kb/corpus';
import { runtimeArtefacts, MAESTRI_DIR } from '../../../../../../scripts/extract-mini-kb';

/**
 * Every Maestro must be answerable from retrieval, and the absence of an answer
 * must be loud.
 *
 * chris had zero RAG coverage: all six of his sections matched the identity
 * patterns, so the extracted didactic text was empty, the seeder produced no
 * chunks for him, and the database held 31 distinct sourceIds for 32 files.
 * Nothing failed. The retriever returned an empty string, the model answered
 * from the persona prompt alone, and the gap was invisible from the outside —
 * it took counting rows to find it.
 *
 * The seeder cannot detect this on its own: an empty file chunks to an empty
 * list, which is indistinguishable from a successful no-op. So the guard sits
 * here, on the corpus, where "this Maestro can be retrieved" is checkable
 * without a database.
 */

function knowledgeFiles(): string[] {
  return fs
    .readdirSync(MAESTRI_DIR)
    .filter((f) => f.endsWith('-knowledge.ts'))
    .sort();
}

describe('every Maestro reaches the RAG index', () => {
  const files = knowledgeFiles();

  /**
   * Anchored to the runtime registry rather than a fixed floor. A hardcoded
   * `>= 32` is satisfied by the files that already exist, so a Maestro added to
   * the registry without a knowledge file would be served with no corpus at all
   * while every assertion below stayed green — the same silence this guard
   * exists to break, one level up.
   */
  it('has a knowledge file for every registered Maestro', () => {
    // Slugs are not ids: `amici-miei-knowledge.ts` serves the Maestro
    // registered as `mascetti`. Resolve through the same alias table the seeder
    // uses, or the check invents gaps that are not there.
    const covered = new Set(
      files.map((f) => resolveMaestroId(f.replace(/-knowledge\.ts$/, ''))),
    );
    const missing = registeredMaestroIds().filter((id) => !covered.has(id));

    expect(
      missing,
      `registered in the runtime but with no knowledge file, so nothing can be ` +
        `seeded or retrieved for them: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it.each(files)('%s yields at least one retrievable chunk', (file) => {
    const artefacts = runtimeArtefacts(path.join(MAESTRI_DIR, file));
    expect(artefacts, `${file}: no knowledge template found`).not.toBeNull();
    if (!artefacts) return;

    const chunks = chunkDidactic(artefacts.didactic);

    expect(
      chunks.length,
      `${file} produces no didactic chunks, so the seeder writes no embeddings for it ` +
        `and the retriever returns an empty string without error — the exact shape of ` +
        `the chris gap. Either give this Maestro didactic content, or record in ` +
        `DATA-GOVERNANCE-SOP.md why he must not be retrievable and exclude him here ` +
        `explicitly.`,
    ).toBeGreaterThan(0);
  });

  it('leaves no Maestro out of the index', () => {
    const seedable = files.filter((file) => {
      const artefacts = runtimeArtefacts(path.join(MAESTRI_DIR, file));
      return artefacts !== null && chunkDidactic(artefacts.didactic).length > 0;
    });

    expect(seedable.length).toBe(files.length);
  });
});
