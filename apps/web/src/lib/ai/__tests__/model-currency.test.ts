/**
 * Model currency guards.
 *
 * Verified against the Azure resource `aoai-virtualbpm-prod` (swedencentral) on
 * 2026-09-16 with `az cognitiveservices model list` / `deployment list`:
 *
 * - gpt-6-astra          2026-09-03  GA       retires 2028-01-11  (deployed, unused)
 * - gpt-5.6-terra        2026-07-09  GA       retires 2028-01-11  (current default)
 * - gpt-chat-latest      2026-05-05  Preview  retires 2026-10-05  (backs gpt-5.x-chat/edu)
 * - gpt-realtime-2.1     2026-07-07  Preview  retires 2026-10-15
 * - gpt-realtime-1.5     2026-02-23  GA       retires 2027-08-24  (GA voice fallback)
 *
 * A tier row still carrying a legacy chat name must never resolve to a deployment
 * whose underlying model retires before the deployments we control.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const originalEnv = { ...process.env };

const PREVIEW_BACKED_DEPLOYMENTS = ['gpt-5-chat', 'gpt-5.2-chat', 'gpt-5.2-edu'];

describe('model currency', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  describe('legacy chat aliases never resolve to a preview-backed deployment', () => {
    it.each(PREVIEW_BACKED_DEPLOYMENTS)(
      'resolves %s to the GA chat deployment even when the legacy env var is set',
      async (legacyModel) => {
        process.env.AZURE_OPENAI_CHAT_DEPLOYMENT = 'gpt-5.6-terra';
        process.env.AZURE_OPENAI_GPT5_CHAT_DEPLOYMENT = 'gpt-5-chat';
        process.env.AZURE_OPENAI_GPT52_CHAT_DEPLOYMENT = 'gpt-5.2-chat';
        process.env.AZURE_OPENAI_GPT52_EDU_DEPLOYMENT = 'gpt-5.2-edu';

        const { getDeploymentForModel } = await import('@/lib/ai/providers/deployment-mapping');

        expect(getDeploymentForModel(legacyModel)).toBe('gpt-5.6-terra');
      },
    );
  });

  describe('retired GPT-4 aliases', () => {
    it('resolves gpt-4o-mini to the GA chat deployment, not the retired GPT-4 deployment', async () => {
      process.env.AZURE_OPENAI_CHAT_DEPLOYMENT = 'gpt-5.6-terra';
      delete process.env.AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT;

      const { getDeploymentForModel } = await import('@/lib/ai/providers/deployment-mapping');

      expect(getDeploymentForModel('gpt-4o-mini')).toBe('gpt-5.6-terra');
    });
  });

  describe('current Azure models are selectable', () => {
    it('does not expose gpt-6-astra: decided 2026-09-16 that its price is not worth it', async () => {
      const { getAvailableModels, hasDeploymentMapping } =
        await import('@/lib/ai/providers/deployment-mapping');

      expect(getAvailableModels()).not.toContain('gpt-6-astra');
      expect(hasDeploymentMapping('gpt-6-astra')).toBe(false);
    });

    it('maps gpt-realtime-2.1-mini so the cost tier can follow the 2.1 line', async () => {
      delete process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V21_MINI;

      const { getDeploymentForModel } = await import('@/lib/ai/providers/deployment-mapping');

      expect(getDeploymentForModel('gpt-realtime-2.1-mini')).toBe('gpt-realtime-2.1-mini');
    });
  });
});
