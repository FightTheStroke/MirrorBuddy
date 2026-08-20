import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { isHandAuthored, MINI_KB_DIR } from '../../../../../../scripts/extract-mini-kb';

/**
 * Hand-authored mini-KBs are the persona text injected into the system prompt.
 * RAG reachability can keep facts available, but it cannot restore the Maestro's
 * authored voice if this file is reduced to a stub.
 */

interface SubstanceMeasurement {
  slug: string;
  uniqueSubstantiveLines: number;
  normalizedCharacters: number;
}

/*
 * Measured on 2026-08-20 across the six hand-authored mini-KBs:
 * loto=15 lines/990 chars, turing=19/1192, noether=19/1260,
 * kahlo=20/1228, austen=21/1239, nightingale=24/1433.
 * The guard sits one line below today's minimum so it catches stubs without
 * forcing every valid persona rewrite to match the current shortest file.
 */
const MIN_UNIQUE_SUBSTANTIVE_LINES = 14;

function miniKBFiles(): string[] {
  return fs
    .readdirSync(MINI_KB_DIR)
    .filter((f) => f.endsWith('.ts'))
    .sort();
}

function templateBody(raw: string): string {
  const start = raw.indexOf('`');
  const end = raw.lastIndexOf('`');
  return start >= 0 && end > start ? raw.slice(start + 1, end) : raw;
}

function normalizeSubstantiveLine(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.length < 12) return null;
  if (/^#+\s+/.test(trimmed)) return null;
  if (/^[-*_=]{3,}$/.test(trimmed)) return null;

  const normalized = trimmed
    .toLowerCase()
    .replace(/[`*_>#[\]().,;:!?"'’“”«»—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized.length >= 12 ? normalized : null;
}

function measureSubstance(file: string): SubstanceMeasurement {
  const raw = fs.readFileSync(path.join(MINI_KB_DIR, file), 'utf-8');
  const uniqueLines = new Set(
    templateBody(raw)
      .split('\n')
      .map(normalizeSubstantiveLine)
      .filter((line): line is string => line !== null),
  );

  return {
    slug: file.replace(/\.ts$/, ''),
    uniqueSubstantiveLines: uniqueLines.size,
    normalizedCharacters: [...uniqueLines].join('\n').length,
  };
}

describe('hand-authored mini-KBs keep enough authored persona substance', () => {
  const handAuthoredFiles = miniKBFiles().filter((file) =>
    isHandAuthored(path.join(MINI_KB_DIR, file)),
  );

  it('finds the hand-authored persona files', () => {
    expect(handAuthoredFiles.length).toBe(6);
  });

  it.each(handAuthoredFiles)('%s has more than a stub of unique authored prose', (file) => {
    const measurement = measureSubstance(file);

    expect(
      measurement.uniqueSubstantiveLines,
      `${measurement.slug} has only ${measurement.uniqueSubstantiveLines} unique substantive ` +
        `line(s) (${measurement.normalizedCharacters} normalized characters). Headings, ` +
        `whitespace-only padding, short fragments, and repeated boilerplate are ignored, ` +
        `because they do not preserve the Maestro voice injected into the system prompt.`,
    ).toBeGreaterThanOrEqual(MIN_UNIQUE_SUBSTANTIVE_LINES);
  });
});
