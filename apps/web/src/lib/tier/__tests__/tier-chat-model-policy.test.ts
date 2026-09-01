import { describe, it, expect } from 'vitest';
import { createFallbackTier } from '../tier-fallbacks';
import { TierCode } from '../types';

/**
 * Guards the decision recorded in ADR 0073 and reaffirmed in Sept 2026: the
 * chat model is not rationed by price plan, and no tier may point at a model
 * retired from Azure (the production database held `gpt-4o` for Base and
 * `gpt-4-turbo` for Pro long after both were retired and removed from the
 * resource, so those users' chat resolved to a deployment that did not exist).
 */
describe('tier chat model policy', () => {
  const tiers = [TierCode.TRIAL, TierCode.BASE, TierCode.PRO].map((code) =>
    createFallbackTier(code),
  );

  const RETIRED = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-35-turbo'];

  it('serves the same chat model to every tier', () => {
    const models = new Set(tiers.map((tier) => tier.chatModel));

    expect(models.size).toBe(1);
  });

  it('serves the current default chat model', () => {
    for (const tier of tiers) {
      expect(tier.chatModel).toBe('gpt-5.6-terra');
    }
  });

  it('never points a tier at a retired model', () => {
    for (const tier of tiers) {
      expect(RETIRED).not.toContain(tier.chatModel);
    }
  });
});
