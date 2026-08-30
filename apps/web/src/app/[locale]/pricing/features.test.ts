import { describe, it, expect } from 'vitest';
import { featuresFor } from './features';

describe('featuresFor', () => {
  const catalogue: Record<string, unknown> = {
    'tiers.trial.features': ['a', 'b'],
    'tiers.pro.features': ['a', 'b', 'c', 'd', 'e', 'f'],
    'tiers.broken.features': 'not an array',
    'tiers.mixed.features': ['a', 42, 'c'],
  };
  const t = { raw: (key: string) => catalogue[key] };

  it('returns every feature a tier actually declares', () => {
    expect(featuresFor(t, 'pro')).toHaveLength(6);
  });

  it('does not invent entries for a shorter tier', () => {
    expect(featuresFor(t, 'trial')).toEqual(['a', 'b']);
  });

  it('returns nothing when the tier is missing entirely', () => {
    expect(featuresFor(t, 'absent')).toEqual([]);
  });

  it('returns nothing when the catalogue entry is not a list', () => {
    expect(featuresFor(t, 'broken')).toEqual([]);
  });

  it('drops entries that are not text', () => {
    expect(featuresFor(t, 'mixed')).toEqual(['a', 'c']);
  });
});
