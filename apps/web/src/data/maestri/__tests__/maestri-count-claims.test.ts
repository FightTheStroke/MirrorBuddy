/**
 * Guards the maestri head-count advertised to users.
 *
 * Every locale states the number of Maestri in marketing copy, metadata and —
 * critically — in the EU AI Act Article 50 disclosure, which is a regulatory
 * statement about how many AI systems the platform exposes.
 *
 * That number was hardcoded in 61 places. When Fratello Loto was added the
 * roster went to 27 and every one of those strings kept saying 26, including
 * the compliance text, and nothing failed. This test makes the copy answerable
 * to the code: add or remove a Maestro and the claims must follow.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { maestri } from '../index';

const LOCALES = ['it', 'en', 'fr', 'de', 'es'] as const;
const MESSAGES_DIR = join(process.cwd(), 'apps', 'web', 'messages');

/** Words that mark a number as a claim about the Maestri roster. */
const SUBJECT_WORDS = [
  'Maestri',
  'maestri',
  'Maestros',
  'maestros',
  'Professor',
  'professor',
  'Profesor',
  'profesor',
  'Professeur',
  'professeur',
  'Meister',
  'meister',
  'Meistern',
  'maîtres',
  'Maîtres',
].join('|');

const CLAIM = new RegExp(
  `\\b(\\d{1,3})\\s+(?:AI|KI|IA|historic\\w*|storic\\w*|virtual\\w*)?\\s*(?:${SUBJECT_WORDS})`,
  'g',
);

function collectStrings(value: unknown, path: string, out: Array<[string, string]>): void {
  if (typeof value === 'string') {
    out.push([path, value]);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectStrings(item, `${path}[${i}]`, out));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      collectStrings(item, `${path}.${key}`, out);
    }
  }
}

/**
 * Trial and Base deliberately expose a subset of the roster, so a smaller
 * number is correct in tier-scoped copy and must not be rewritten to the total.
 */
const TIER_SCOPED =
  /tierComparison\.tiers\.(trial|base)\b|quickStart\.trial\b|trialLimits\b|common\.trial\b|tierSystem\.(trial|base)\b|tldrItems\.free\b/;

function stringsFor(locale: string): Array<[string, string]> {
  const dir = join(MESSAGES_DIR, locale);
  const out: Array<[string, string]> = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    collectStrings(JSON.parse(readFileSync(join(dir, file), 'utf-8')), file, out);
  }
  return out.filter(([path]) => !TIER_SCOPED.test(path));
}

describe('maestri count claims', () => {
  const expected = maestri.length;

  it('has a roster to advertise', () => {
    expect(expected).toBeGreaterThan(0);
  });

  it.each(LOCALES)('states the real number of Maestri in %s', (locale) => {
    const wrong: string[] = [];

    for (const [path, text] of stringsFor(locale)) {
      for (const match of text.matchAll(CLAIM)) {
        const claimed = Number(match[1]);
        // Ignore incidental numbers such as prices or years that happen to sit
        // next to the word: a roster claim is a plausible head-count.
        if (claimed > 0 && claimed < 200 && claimed !== expected) {
          wrong.push(`${path} claims ${claimed} (real: ${expected}): "${text.slice(0, 100)}"`);
        }
      }
    }

    expect(wrong).toEqual([]);
  });

  it('offers every Maestro on the Pro tier', () => {
    // Pro is sold as full access. Loto shipped without being added here, so the
    // top tier listed one Maestro fewer than the roster holds. The seed is an
    // async Prisma routine rather than exported data, so we read the literal.
    const seed = readFileSync(
      join(process.cwd(), 'apps', 'web', 'src', 'lib', 'seeds', 'tier-seed.ts'),
      'utf-8',
    );
    const lists = [...seed.matchAll(/availableMaestri:\s*\[([^\]]*)\]/g)].map((m) =>
      [...m[1].matchAll(/'([^']+)'/g)].map((q) => q[1]),
    );

    // Pro is the last and largest list in the file.
    const pro = lists[lists.length - 1] ?? [];
    const missing = maestri.map((m) => m.id).filter((id) => !pro.includes(id));

    expect(missing).toEqual([]);
  });
});
