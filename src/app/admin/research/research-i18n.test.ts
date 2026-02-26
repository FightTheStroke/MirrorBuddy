import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const LOCALES = ['en', 'it', 'de', 'es', 'fr'] as const;
const REQUIRED_KEYS = [
  'research.stats.sectionAriaLabel',
  'research.stats.rankLabel',
  'research.stats.completedExperiments',
  'research.stats.averageLabel',
  'research.stats.dimensions.scaffolding',
  'research.stats.dimensions.hinting',
  'research.stats.dimensions.adaptation',
  'research.stats.dimensions.misconceptionHandling',
  'research.form.title',
  'research.form.name',
  'research.form.hypothesis',
  'research.form.maestroId',
  'research.form.syntheticProfileId',
  'research.form.turns',
  'research.form.topic',
  'research.form.difficulty',
  'research.form.selectPlaceholder',
  'research.form.submit',
  'research.form.submitting',
  'research.form.success',
  'research.form.error',
  'research.form.validationRequired',
  'research.form.validationTurns',
  'research.ranking.rank',
  'research.ranking.average',
];

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (typeof acc !== 'object' || acc === null || !(part in acc)) {
      return undefined;
    }
    return (acc as Record<string, unknown>)[part];
  }, obj);
}

describe('research locale keys', () => {
  it.each(LOCALES)('contains dashboard keys for %s locale', async (locale) => {
    const filePath = join(process.cwd(), 'messages', locale, 'research.json');
    const file = await readFile(filePath, 'utf8');
    const content = JSON.parse(file) as unknown;

    for (const key of REQUIRED_KEYS) {
      expect(getByPath(content, key), `missing key "${key}" in ${locale}`).toBeTypeOf('string');
    }
  });
});
