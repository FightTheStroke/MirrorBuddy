import { describe, expect, it } from 'vitest';

import de from '@/../messages/de/community.json';
import en from '@/../messages/en/community.json';
import es from '@/../messages/es/community.json';
import fr from '@/../messages/fr/community.json';
import itLocale from '@/../messages/it/community.json';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const flattenKeys = (value: JsonValue, prefix = ''): string[] => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  const entries = Object.entries(value);

  return entries.flatMap(([key, child]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    const nested = flattenKeys(child, nextPrefix);

    return nested.length > 0 ? nested : [nextPrefix];
  });
};

describe('community i18n namespace', () => {
  const locales = { en, it: itLocale, de, es, fr };

  it('defines the community namespace in all locales', () => {
    for (const [locale, messages] of Object.entries(locales)) {
      expect(messages).toHaveProperty('community');
      expect(typeof messages.community).toBe('object');
      expect(Object.keys(messages.community)).not.toHaveLength(0);
      expect(JSON.stringify(messages.community).toLowerCase()).toMatch(/submit|contribution/);
      expect(locale).toBeTruthy();
    }
  });

  it('keeps top-level key counts aligned across locales', () => {
    const expectedCount = Object.keys(en).length;

    for (const [locale, messages] of Object.entries(locales)) {
      expect(Object.keys(messages)).toHaveLength(expectedCount);
      expect(locale).toBeTruthy();
    }
  });

  it('keeps nested community key sets aligned across locales', () => {
    const expectedKeys = flattenKeys(en.community as JsonValue).sort();

    for (const [locale, messages] of Object.entries(locales)) {
      const localeKeys = flattenKeys(messages.community as JsonValue).sort();
      expect(localeKeys, `key mismatch for ${locale}`).toEqual(expectedKeys);
    }
  });
});
