import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const LOCALES = ['en', 'it', 'de', 'es', 'fr'] as const;

const REQUIRED_ABTESTING_KEYS = [
  'admin.abTesting.manageTitle',
  'admin.abTesting.manageDescription',
  'admin.abTesting.createExperiment',
  'admin.abTesting.editExperiment',
  'admin.abTesting.deleteExperiment',
  'admin.abTesting.confirmDelete',
  'admin.abTesting.cannotDeleteActive',
  'admin.abTesting.activate',
  'admin.abTesting.complete',
  'admin.abTesting.statusDraft',
  'admin.abTesting.statusActive',
  'admin.abTesting.statusCompleted',
  'admin.abTesting.invalidTransition',
  'admin.abTesting.experimentName',
  'admin.abTesting.saveChanges',
  'admin.abTesting.deleteSuccess',
  'admin.abTesting.activateSuccess',
  'admin.abTesting.completeSuccess',
];

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (typeof acc !== 'object' || acc === null || !(part in acc)) {
      return undefined;
    }
    return (acc as Record<string, unknown>)[part];
  }, obj);
}

describe('ab-testing manage page locale keys', () => {
  it.each(LOCALES)('contains abTesting manage keys for %s locale', async (locale) => {
    const filePath = join(process.cwd(), 'messages', locale, 'admin.json');
    const file = await readFile(filePath, 'utf8');
    const content = JSON.parse(file) as unknown;

    for (const key of REQUIRED_ABTESTING_KEYS) {
      expect(getByPath(content, key), `missing key "${key}" in ${locale}`).toBeTypeOf('string');
    }
  });
});
