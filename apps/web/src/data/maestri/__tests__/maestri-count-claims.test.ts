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

  it('offers every Maestro on the Pro tier, on create and on update', async () => {
    // Pro is sold as full access. Loto shipped without being added to the seed,
    // so the top tier silently listed one Maestro fewer than the roster held.
    // The list is derived now, and this asserts the behaviour rather than the
    // source text: both the create and the update path must carry the roster,
    // because an already-seeded database only ever takes the update path.
    const { seedTiers } = await import('@/lib/seeds/tier-seed');

    const calls: Array<{ where: { code: string }; create: Record<string, unknown>; update: Record<string, unknown> }> = [];
    const prisma = {
      tierDefinition: {
        upsert: (args: (typeof calls)[number]) => {
          calls.push(args);
          return Promise.resolve({ code: args.where.code });
        },
      },
    };

    await seedTiers(prisma as unknown as Parameters<typeof seedTiers>[0]);

    const pro = calls.find((c) => c.where.code === 'pro');
    expect(pro, 'the seed never upserted a pro tier').toBeDefined();

    const everyId = maestri.map((m) => m.id);
    expect(pro?.create.availableMaestri).toEqual(everyId);
    expect(pro?.update.availableMaestri).toEqual(everyId);
  });
});
