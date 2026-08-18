/**
 * Provenance headers on the didactic corpus (DATA-GOVERNANCE-SOP.md §5).
 *
 * The SOP is binding but was, until this test, enforced only by review: a file
 * could be added with no stated sources, or a class D Maestro — a living
 * person, an in-copyright work, a character — could ship with no recorded
 * sign-off, and nothing would object. That is finding G-5.
 */

import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const MAESTRI_DIR = path.join(__dirname, '../../../data/maestri');

interface Header {
  slug: string;
  sources: string | null;
  sourceClass: string | null;
  signOff: string | null;
}

function readHeaders(): Header[] {
  return fs
    .readdirSync(MAESTRI_DIR)
    .filter((f) => f.endsWith('-knowledge.ts'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(MAESTRI_DIR, file), 'utf-8');
      const header = raw.slice(0, raw.indexOf('*/'));
      const field = (name: string) =>
        header.match(new RegExp(`^ \\* ${name}: (.+)$`, 'm'))?.[1] ?? null;
      return {
        slug: file.replace('-knowledge.ts', ''),
        sources: field('Sources'),
        sourceClass: field('Source class'),
        signOff: field('Sign-off'),
      };
    });
}

describe('knowledge base provenance headers', () => {
  const headers = readHeaders();

  it('finds the corpus', () => {
    expect(headers.length).toBeGreaterThanOrEqual(32);
  });

  it('names sources in every file', () => {
    for (const h of headers) {
      expect(h.sources, `${h.slug}: missing "Sources:"`).toBeTruthy();
    }
  });

  it('declares a source class of A, B, C or D in every file', () => {
    for (const h of headers) {
      expect(h.sourceClass?.[0], `${h.slug}: missing or invalid "Source class:"`).toMatch(
        /^[ABCD]$/,
      );
    }
  });

  // The rule that actually carries risk. Class D is living persons,
  // in-copyright works and characters used as personas: personality rights,
  // trademark and misrepresentation, not just copyright.
  it('records a named sign-off for every class D file, and none elsewhere', () => {
    for (const h of headers) {
      const isClassD = h.sourceClass?.startsWith('D');
      expect(h.signOff, `${h.slug}: missing "Sign-off:"`).toBeTruthy();

      if (isClassD) {
        expect(h.signOff, `${h.slug}: class D requires a real sign-off, not "n/a"`).not.toBe('n/a');
        expect(h.signOff, `${h.slug}: class D sign-off must name someone and a date`).toMatch(
          /\w+.*\d{4}/,
        );
      } else {
        expect(h.signOff, `${h.slug}: only class D takes a sign-off`).toBe('n/a');
      }
    }
  });

  it('keeps the class D roster explicit', () => {
    const classD = headers.filter((h) => h.sourceClass?.startsWith('D')).map((h) => h.slug);
    expect(classD.sort()).toEqual([
      'alex-pina',
      'amici-miei',
      'cassese',
      'chris',
      'loto',
      'simone',
    ]);
  });
});
