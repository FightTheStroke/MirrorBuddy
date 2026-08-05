/**
 * Pricing has to be right in the boring cases and safe in the broken ones: an
 * unknown model, a malformed event, a negative token count. A cost dashboard
 * that quietly reports zero is worse than no dashboard, because it is believed.
 */

import { describe, expect, it, afterEach, vi } from 'vitest';
import { parseRealtimeUsage, priceUsage, ratesFor, USD_PER_EUR } from '../voice-pricing';

describe('ratesFor', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prices the mini model well below the full one', () => {
    expect(ratesFor('gpt-realtime-mini').audioOut).toBeLessThan(ratesFor('gpt-realtime').audioOut);
  });

  it('tolerates the deployment-name suffixes Azure actually hands out', () => {
    expect(ratesFor('gpt-realtime-mini-2025-12-15')).toEqual(ratesFor('gpt-realtime-mini'));
    expect(ratesFor('GPT-Realtime')).toEqual(ratesFor('gpt-realtime'));
  });

  it('never prices an unknown model at zero', () => {
    const unknown = ratesFor('some-model-we-have-not-met');
    expect(unknown.audioOut).toBeGreaterThan(0);
    expect(unknown).toEqual(ratesFor('gpt-realtime')); // assume the expensive one
  });

  it('can be corrected without a deploy when Azure changes its price list', () => {
    vi.stubEnv(
      'AZURE_VOICE_RATES_JSON',
      JSON.stringify({
        'gpt-realtime': { audioIn: 1, audioOut: 2, textIn: 3, textOut: 4, cachedIn: 5 },
      }),
    );
    expect(ratesFor('gpt-realtime').audioOut).toBe(2);
  });

  it('ignores a malformed override rather than taking pricing down', () => {
    vi.stubEnv('AZURE_VOICE_RATES_JSON', '{not json');
    expect(ratesFor('gpt-realtime').audioOut).toBe(64);
  });
});

describe('priceUsage', () => {
  it('charges spoken output more than listened input', () => {
    const listened = priceUsage('gpt-realtime', { audioInputTokens: 1_000_000 });
    const spoken = priceUsage('gpt-realtime', { audioOutputTokens: 1_000_000 });
    expect(spoken.totalCostEur).toBeGreaterThan(listened.totalCostEur);
  });

  it('converts to euro at the documented rate', () => {
    const priced = priceUsage('gpt-realtime', { audioInputTokens: 1_000_000 });
    expect(priced.audioInputCostEur).toBeCloseTo(32 / USD_PER_EUR, 4);
  });

  it('never credits money back for a corrupted event', () => {
    const priced = priceUsage('gpt-realtime', {
      audioInputTokens: -5_000_000,
      audioOutputTokens: Number.NaN,
    });
    expect(priced.totalCostEur).toBe(0);
  });

  it('keeps a single short answer visible instead of rounding it to nothing', () => {
    // ~10 seconds of speech. If this rounds to 0.00 the per-user totals are lies.
    const priced = priceUsage('gpt-realtime-mini', { audioOutputTokens: 1000 });
    expect(priced.totalCostEur).toBeGreaterThan(0);
  });
});

describe('parseRealtimeUsage', () => {
  it('reads the block Azure actually sends on response.done', () => {
    const usage = parseRealtimeUsage({
      total_tokens: 1500,
      input_tokens: 1000,
      output_tokens: 500,
      input_token_details: { text_tokens: 200, audio_tokens: 800, cached_tokens: 128 },
      output_token_details: { text_tokens: 100, audio_tokens: 400 },
    });

    expect(usage.audioInputTokens).toBe(800);
    expect(usage.audioOutputTokens).toBe(400);
    expect(usage.textInputTokens).toBe(200);
    expect(usage.textOutputTokens).toBe(100);
    expect(usage.cachedInputTokens).toBe(128);
  });

  it('returns zeros instead of throwing inside the event loop', () => {
    for (const bad of [null, undefined, 'nonsense', 42, {}]) {
      expect(parseRealtimeUsage(bad).audioOutputTokens).toBe(0);
    }
  });
});
