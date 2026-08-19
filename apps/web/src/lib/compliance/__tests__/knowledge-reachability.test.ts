import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runtimeArtefacts, MAESTRI_DIR, MINI_KB_DIR } from '../../../../../../scripts/extract-mini-kb';

/**
 * Nothing an author writes may be unreachable at runtime.
 *
 * A knowledge file feeds two paths and only two: the mini-KB inlined into the
 * persona prompt, and the didactic text embedded for RAG. Identity sections go
 * to the first, everything else to the second — and the mini-KB is capped, so
 * for a long identity section the tail used to land in neither. It was not
 * reported, and the Maestro answered anyway: 305 lines across 17 of the 32
 * Maestri existed in the repository and nowhere in the running system.
 *
 * The cap has to stay — the mini-KB is inlined into every prompt. So the
 * overflow is routed to RAG instead of dropped, and this asserts the invariant
 * that makes that safe.
 */

/** Structure that carries no meaning on its own. */
function isContentLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 4) return false;
  if (/^#+\s*$/.test(trimmed)) return false;
  if (/^[-*_=]{3,}$/.test(trimmed)) return false;
  return true;
}

function knowledgeFiles(): string[] {
  return fs
    .readdirSync(MAESTRI_DIR)
    .filter((f) => f.endsWith('-knowledge.ts'))
    .sort();
}

describe('no knowledge line is unreachable at runtime', () => {
  const files = knowledgeFiles();

  it('finds the corpus', () => {
    expect(files.length).toBeGreaterThanOrEqual(32);
  });

  it.each(files)('%s reaches either the mini-KB or RAG, line by line', (file) => {
    const artefacts = runtimeArtefacts(path.join(MAESTRI_DIR, file));
    expect(artefacts, `${file}: no knowledge template found`).not.toBeNull();
    if (!artefacts) return;

    const reachable = `${artefacts.miniKB}\n${artefacts.didactic}`;
    const lost = artefacts.source
      .split('\n')
      .filter(isContentLine)
      .filter((line) => !reachable.includes(line.trim()));

    expect(
      lost,
      `${file}: ${lost.length} line(s) reach neither the persona prompt nor RAG. ` +
        `The mini-KB cap dropped them and nothing else picked them up:\n` +
        lost
          .slice(0, 5)
          .map((l) => `  ${l.trim().slice(0, 80)}`)
          .join('\n'),
    ).toEqual([]);
  });

  it('routes the capped identity overflow to RAG rather than dropping it', () => {
    // socrate is the worst case in the corpus: 47 identity lines past the cap.
    const artefacts = runtimeArtefacts(path.join(MAESTRI_DIR, 'socrate-knowledge.ts'));
    expect(artefacts).not.toBeNull();
    if (!artefacts) return;

    expect(artefacts.miniKB.split('\n').length).toBeLessThanOrEqual(50);
    expect(artefacts.didactic).toContain('Approfondimento');
  });

  /**
   * Six mini-KBs are written by hand and the generated one is discarded. The
   * first version of this guard recomputed the generated artefact for them too,
   * so it compared the source against a file that never ships — and stayed green
   * while Austen's identity facts were reachable from nowhere. These assert the
   * guard reads what production reads.
   */
  describe('hand-authored mini-KBs are measured against the file that ships', () => {
    it('finds the hand-authored Maestri', () => {
      const handAuthored = files
        .map((f) => ({ f, a: runtimeArtefacts(path.join(MAESTRI_DIR, f)) }))
        .filter(({ a }) => a?.handAuthored);
      expect(handAuthored.length).toBeGreaterThan(0);
    });

    it('reads the committed file, not a recomputed one', () => {
      const artefacts = runtimeArtefacts(path.join(MAESTRI_DIR, 'austen-knowledge.ts'));
      expect(artefacts).not.toBeNull();
      if (!artefacts) return;

      expect(artefacts.handAuthored).toBe(true);
      const onDisk = fs.readFileSync(path.join(MINI_KB_DIR, 'austen.ts'), 'utf-8');
      expect(artefacts.miniKB).toBe(onDisk);
    });

    it('sends identity content the human rewrite does not carry to RAG', () => {
      const artefacts = runtimeArtefacts(path.join(MAESTRI_DIR, 'austen-knowledge.ts'));
      expect(artefacts).not.toBeNull();
      if (!artefacts) return;

      // Biographical detail present in the source and absent from the rewrite.
      const inRewrite = artefacts.miniKB.includes('Steventon');
      const reachable = `${artefacts.miniKB}\n${artefacts.didactic}`;
      expect(inRewrite || reachable.includes('Steventon')).toBe(true);
    });
  });
});
