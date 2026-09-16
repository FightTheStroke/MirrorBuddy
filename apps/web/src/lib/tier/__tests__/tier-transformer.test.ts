import { describe, expect, it } from 'vitest';
import { createFallbackTier } from '../tier-fallbacks';
import { transformTier } from '../tier-transformer';
import { TierCode } from '../types';

describe('transformTier', () => {
  it.each([TierCode.TRIAL, TierCode.BASE, TierCode.PRO])(
    'does not leak the retained database voice column into the %s tier',
    (code) => {
      const expected = { ...createFallbackTier(TierCode.BASE), code };
      const databaseRow = { ...expected, realtimeModel: 'legacy-voice-deployment' };

      const tier = transformTier(databaseRow);

      expect(tier).toEqual(expected);
      expect(tier).not.toHaveProperty('realtimeModel');
      expect(databaseRow.realtimeModel).toBe('legacy-voice-deployment');
    },
  );

  it('preserves price conversion and JSON array normalization', () => {
    const databaseRow = {
      ...createFallbackTier(TierCode.BASE),
      monthlyPriceEur: { toNumber: () => 9.99 },
      availableMaestri: null,
      availableCoaches: undefined,
      availableBuddies: {},
      availableTools: 'invalid',
    };

    expect(transformTier(databaseRow)).toMatchObject({
      monthlyPriceEur: 9.99,
      availableMaestri: [],
      availableCoaches: [],
      availableBuddies: [],
      availableTools: [],
    });
  });
});
