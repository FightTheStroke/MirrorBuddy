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
import { findAttributedQuotes } from '../attributed-quotes';

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
      // Match the whole value, not its first character: "Classified" starts
      // with a C and would otherwise pass as class C. Only a bare letter, or a
      // letter followed by the parenthesised reason the SOP asks for, is valid.
      expect(h.sourceClass, `${h.slug}: missing or invalid "Source class:"`).toMatch(
        /^[ABCD](\s+\(.*)?$/,
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

  // Added after the first gate on this work rejected it. The G-4 audit asked
  // only "was phrasing carried over from Wikipedia?", so it never looked at the
  // two files whose real exposure was reproducing a third party's copyrighted
  // work: a curated list of a TV series' dialogue, and one of a film's. Both
  // announced themselves with a quotations heading, which is cheap to detect.
  //
  // This does not prove a file is free of reproduced expression — quotes can be
  // scattered through prose with no heading at all. It removes the specific
  // blind spot that got past a human audit, and nothing more. SOP §7 review
  // still owns the rest.
  it('does not collect quotations from a source in class D files', () => {
    const quotationHeading = /^#+\s*(citazioni|quotes|frasi celebri|frasi famose)/im;

    for (const h of headers) {
      if (!h.sourceClass?.startsWith('D')) continue;
      const body = fs.readFileSync(path.join(MAESTRI_DIR, `${h.slug}-knowledge.ts`), 'utf-8');
      expect(
        quotationHeading.test(body),
        `${h.slug}: class D file collects quotations. Reproducing dialogue from an ` +
          `in-copyright work is what SOP §3 forbids class D from taking.`,
      ).toBe(false);
    }
  });

  // G-7. The rule above fires on a heading, so the same material written into
  // ordinary prose walked straight past it — demonstrated by mutation during
  // the gate on the provenance card, where fabricated speaker-attributed
  // dialogue inserted under a normal section left every guard green and would
  // have shipped to the model. This reads the full text instead, and looks for
  // the shape that carries the risk: a quoted string presented as a named
  // person's or character's own words.
  it('does not put words in a named mouth anywhere in a class D file', () => {
    for (const h of headers) {
      if (!h.sourceClass?.startsWith('D')) continue;
      const body = fs.readFileSync(path.join(MAESTRI_DIR, `${h.slug}-knowledge.ts`), 'utf-8');
      const attributed = findAttributedQuotes(body);

      expect(
        attributed,
        `${h.slug}: quotes attributed to a named speaker outside any quotations ` +
          `heading:\n` +
          attributed.map((a) => `  L${a.line} ${a.speaker} → "${a.quote}"`).join('\n') +
          `\nSOP §3 does not let class D reproduce a third party's expression. ` +
          `Rewrite it as indirect speech.`,
      ).toEqual([]);
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
