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
  uniqueSentences: number;
  normalizedCharacters: number;
}

/*
 * The threshold is set on characters of normalized prose, not on source lines.
 * Line counts are controlled by the author's wrapping: reflowing an unchanged
 * mini-KB into fewer long lines would fail the guard, while a short stub broken
 * across many short lines would pass it. Both are wrong answers about persona
 * substance, so the metric ignores line breaks entirely and measures how much
 * distinct prose survives normalization.
 *
 * Measured on 2026-08-20 across the six hand-authored mini-KBs (unique
 * sentences / normalized characters): loto=18/978, turing=15/1192,
 * austen=19/1240, kahlo=20/1247, noether=19/1260, nightingale=17/1433.
 * 500 is roughly half the shortest file, so ordinary persona edits have room,
 * and it is well above the few-hundred-character stub this guard exists to
 * reject. If a mini-KB is deliberately shortened below it, lower this number in
 * the same commit and say why.
 */
const MIN_NORMALIZED_CHARACTERS = 500;

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

function normalizeProse(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_>#[\]().,;:!?"'’“”«»—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split on sentence enders rather than on newlines, so the measurement does not
 * change when an author rewraps the same prose.
 */
function substantiveSentences(body: string): string[] {
  return body
    .split('\n')
    .filter((line) => !/^\s*[-*_=]{3,}\s*$/.test(line))
    // Strip the heading marker rather than dropping the whole line. Dropping by
    // line makes the measurement depend on where the line breaks fall: once a
    // file is reflowed, a heading and the prose after it share one physical
    // line and the prose would vanish with it.
    .map((line) => line.replace(/^\s*#+\s+/, ''))
    .join(' ')
    .split(/(?<=[.!?])\s+/)
    .map(normalizeProse)
    .filter((sentence) => sentence.length >= 12);
}

function measureSubstance(file: string): SubstanceMeasurement {
  const raw = fs.readFileSync(path.join(MINI_KB_DIR, file), 'utf-8');
  const unique = new Set(substantiveSentences(templateBody(raw)));

  return {
    slug: file.replace(/\.ts$/, ''),
    uniqueSentences: unique.size,
    normalizedCharacters: [...unique].join(' ').length,
  };
}

describe('hand-authored mini-KBs keep enough authored persona substance', () => {
  const handAuthoredFiles = miniKBFiles().filter((file) =>
    isHandAuthored(path.join(MINI_KB_DIR, file)),
  );

  it('finds the hand-authored persona files', () => {
    expect(
      handAuthoredFiles.length,
      'hand-authored mini-KB discovery dropped below the known floor of six files, so discovery itself is broken and some personas are unguarded. If a hand-authored mini-KB is intentionally deleted, lower this floor deliberately in the same commit and explain why.',
    ).toBeGreaterThanOrEqual(6);
  });

  it.each(handAuthoredFiles)('%s has more than a stub of unique authored prose', (file) => {
    const measurement = measureSubstance(file);

    expect(
      measurement.normalizedCharacters,
      `${measurement.slug} keeps only ${measurement.normalizedCharacters} characters of unique ` +
        `normalized prose across ${measurement.uniqueSentences} distinct sentence(s). Headings, ` +
        `separators, short fragments, and repeated boilerplate are ignored, because they do not ` +
        `preserve the Maestro voice injected into the system prompt. Line breaks are ignored too, ` +
        `so rewrapping the same text cannot change this number.`,
    ).toBeGreaterThanOrEqual(MIN_NORMALIZED_CHARACTERS);
  });
});
