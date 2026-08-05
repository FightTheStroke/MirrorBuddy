/**
 * The browser must not be able to decide what a turn cost.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const isFeatureEnabled = vi.fn();

vi.mock('@/lib/feature-flags/feature-flags-service', () => ({
  isFeatureEnabled: (flag: string) => isFeatureEnabled(flag),
}));

const { resolveVoiceModel } = await import('../voice-model');

const KEYS = [
  'AZURE_OPENAI_REALTIME_DEPLOYMENT',
  'AZURE_OPENAI_REALTIME_DEPLOYMENT_V15',
  'AZURE_OPENAI_REALTIME_DEPLOYMENT_V2',
  'AZURE_OPENAI_REALTIME_DEPLOYMENT_V21',
];

/** Enables only the named flags, so precedence can be pinned exactly. */
function flags(...enabled: string[]): void {
  isFeatureEnabled.mockImplementation(async (flag: string) => ({
    enabled: enabled.includes(flag),
  }));
}

describe('resolveVoiceModel', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    flags();
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    vi.clearAllMocks();
  });

  it('believes Azure over any guess when the event names the model', async () => {
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = 'legacy';

    await expect(resolveVoiceModel('gpt-realtime-mini')).resolves.toBe('gpt-realtime-mini');
  });

  it('does not let a blank report win over the configured deployment', async () => {
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = 'legacy';

    await expect(resolveVoiceModel('   ')).resolves.toBe('legacy');
  });

  it('reports the deployment the turn actually connected with', async () => {
    // The whole point: no client default, the same answer the token endpoint gave.
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = 'legacy';

    await expect(resolveVoiceModel()).resolves.toBe('legacy');
  });

  it('follows the token endpoint precedence when 2.1 is on', async () => {
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = 'legacy';
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V15 = 'v15';
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V2 = 'v2';
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V21 = 'v21';
    flags('voice_realtime_21');

    await expect(resolveVoiceModel()).resolves.toBe('v21');
  });

  it('ignores a newer deployment while its flag is off', async () => {
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = 'legacy';
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V21 = 'v21';

    await expect(resolveVoiceModel()).resolves.toBe('legacy');
  });

  it('falls back through the chain when the flagged deployment is unset', async () => {
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = 'legacy';
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V15 = 'v15';
    flags('voice_realtime_2');

    await expect(resolveVoiceModel()).resolves.toBe('v15');
  });

  it('uses the 1.5 deployment when only that flag is on', async () => {
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = 'legacy';
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V15 = 'v15';
    flags('voice_realtime_15');

    await expect(resolveVoiceModel()).resolves.toBe('v15');
  });

  it('overstates rather than understates when nothing is configured', async () => {
    await expect(resolveVoiceModel()).resolves.toBe('gpt-realtime');
  });
});
