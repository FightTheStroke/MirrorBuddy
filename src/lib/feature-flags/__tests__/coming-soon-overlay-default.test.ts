/**
 * TDD: coming_soon_overlay feature flag default behavior
 *
 * Plan 157 / T0-03: Register coming_soon_overlay flag
 * - Must be disabled by default (overlay is opt-in via admin toggle)
 * - Present in both server-side service and client-safe module
 * - Must have explicit name/description (not the 'Unknown feature' fallback)
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { isFeatureEnabled as clientIsFeatureEnabled } from '@/lib/feature-flags/client';

describe('coming_soon_overlay feature flag', () => {
  describe('client-side (client.ts)', () => {
    it('is disabled by default', () => {
      const result = clientIsFeatureEnabled('coming_soon_overlay');
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('disabled');
    });

    it('has explicit flag definition (not unknown feature fallback)', () => {
      const result = clientIsFeatureEnabled('coming_soon_overlay');
      expect(result.flag.id).toBe('coming_soon_overlay');
      expect(result.flag.status).toBe('disabled');
      expect(result.flag.killSwitch).toBe(false);
      // Should have real name/description, NOT the 'Unknown feature' fallback
      expect(result.flag.name).not.toBe('coming_soon_overlay');
      expect(result.flag.description).not.toBe('Unknown feature');
      expect(result.flag.name).toBeTruthy();
      expect(result.flag.description).toBeTruthy();
    });
  });

  describe('server-side (feature-flags-service.ts)', () => {
    beforeEach(async () => {
      const { _resetForTesting } = await import('@/lib/feature-flags/feature-flags-service');
      _resetForTesting();
    });

    it('is disabled by default via sync fallback', async () => {
      const { isFeatureEnabled } = await import('@/lib/feature-flags/feature-flags-service');
      const result = isFeatureEnabled('coming_soon_overlay');
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('disabled');
    });

    it('has explicit default configuration (not unknown flag fallback)', async () => {
      const { isFeatureEnabled } = await import('@/lib/feature-flags/feature-flags-service');
      const result = isFeatureEnabled('coming_soon_overlay');
      expect(result.flag.id).toBe('coming_soon_overlay');
      expect(result.flag.status).toBe('disabled');
      expect(result.flag.killSwitch).toBe(false);
      // Should have real name/description, NOT the 'Unknown feature' fallback
      expect(result.flag.name).not.toBe('coming_soon_overlay');
      expect(result.flag.description).not.toBe('Unknown feature');
    });
  });
});
