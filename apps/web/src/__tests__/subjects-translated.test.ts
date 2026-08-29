import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { subjectNames } from '@/data/subjects';

const LOCALES = ['it', 'en', 'fr', 'de', 'es'] as const;
const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MESSAGES_DIR = join(APP_ROOT, 'messages');

function subjectKeysFor(locale: string): string[] {
  const raw = readFileSync(join(MESSAGES_DIR, locale, 'home.json'), 'utf-8');
  const parsed = JSON.parse(raw) as { home?: { subjects?: Record<string, string> } };
  return Object.keys(parsed.home?.subjects ?? {});
}

describe('every subject a student can pick has a name in every language', () => {
  const registered = Object.keys(subjectNames);

  it.each(LOCALES)('%s translates all registered subjects', (locale) => {
    const translated = subjectKeysFor(locale);
    const missing = registered.filter((subject) => !translated.includes(subject));

    expect(missing).toEqual([]);
  });

  it.each(LOCALES)('%s carries no subject the registry does not know', (locale) => {
    const translated = subjectKeysFor(locale);
    const orphaned = translated.filter((subject) => !registered.includes(subject));

    expect(orphaned).toEqual([]);
  });
});
