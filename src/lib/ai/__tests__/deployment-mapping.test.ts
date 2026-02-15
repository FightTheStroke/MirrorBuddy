/**
 * Tests for Azure OpenAI deployment mapping (T1-16)
 *
 * Validates:
 * - GA model names (gpt-realtime, gpt-realtime-mini) are mapped correctly
 * - No deprecated gpt-4o-realtime-preview references in defaults
 * - Tier-based deployment mapping: Pro -> gpt-realtime, Base/Trial -> gpt-realtime-mini
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Save original env
const originalEnv = { ...process.env };

describe('deployment-mapping', () => {
  beforeEach(() => {
    // Clear realtime-related env vars to test defaults
    delete process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;
    delete process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI;
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  describe('GA model deployment defaults', () => {
    it('should map gpt-realtime to GA deployment name (not preview)', async () => {
      const { getDeploymentForModel } = await import('@/lib/ai/providers/deployment-mapping');

      const deployment = getDeploymentForModel('gpt-realtime');

      // Must NOT contain "4o" or "preview" in the default
      expect(deployment).not.toContain('4o');
      expect(deployment).not.toContain('preview');
      expect(deployment).toBe('gpt-realtime');
    });

    it('should map gpt-realtime-mini to GA deployment name', async () => {
      const { getDeploymentForModel } = await import('@/lib/ai/providers/deployment-mapping');

      const deployment = getDeploymentForModel('gpt-realtime-mini');

      expect(deployment).not.toContain('4o');
      expect(deployment).not.toContain('preview');
      expect(deployment).toBe('gpt-realtime-mini');
    });

    it('should respect env var override for gpt-realtime', async () => {
      process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = 'custom-realtime-deploy';

      const { getDeploymentForModel } = await import('@/lib/ai/providers/deployment-mapping');

      expect(getDeploymentForModel('gpt-realtime')).toBe('custom-realtime-deploy');
    });

    it('should respect env var override for gpt-realtime-mini', async () => {
      process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI = 'custom-mini-deploy';

      const { getDeploymentForModel } = await import('@/lib/ai/providers/deployment-mapping');

      expect(getDeploymentForModel('gpt-realtime-mini')).toBe('custom-mini-deploy');
    });
  });

  describe('no deprecated references in available models', () => {
    it('should not list gpt-4o-realtime-preview in available models', async () => {
      const { getAvailableModels } = await import('@/lib/ai/providers/deployment-mapping');

      const models = getAvailableModels();

      expect(models).not.toContain('gpt-4o-realtime-preview');
      expect(models).toContain('gpt-realtime');
      expect(models).toContain('gpt-realtime-mini');
    });
  });
});

describe('tier realtime model mapping', () => {
  it('should map Trial tier to gpt-realtime-mini (cost-effective)', async () => {
    // eslint-disable-next-line local-rules/enforce-module-boundaries -- test needs internal sub-module access
    const { createFallbackTier } = await import('@/lib/tier/tier-fallbacks');
    // eslint-disable-next-line local-rules/enforce-module-boundaries -- test needs internal sub-module access
    const { TierCode } = await import('@/lib/tier/types');

    const trial = createFallbackTier(TierCode.TRIAL);
    expect(trial.realtimeModel).toBe('gpt-realtime-mini');
  });

  it('should map Base tier to gpt-realtime-mini (cost-effective)', async () => {
    // eslint-disable-next-line local-rules/enforce-module-boundaries -- test needs internal sub-module access
    const { createFallbackTier } = await import('@/lib/tier/tier-fallbacks');
    // eslint-disable-next-line local-rules/enforce-module-boundaries -- test needs internal sub-module access
    const { TierCode } = await import('@/lib/tier/types');

    // Base tier should use mini for cost-effectiveness
    const base = createFallbackTier(TierCode.BASE);
    expect(base.realtimeModel).toBe('gpt-realtime-mini');
  });
});
