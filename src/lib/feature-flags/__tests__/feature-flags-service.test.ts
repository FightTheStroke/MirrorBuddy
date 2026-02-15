/**
 * Unit tests for feature-flags-service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    featureFlag: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) =>
        Promise.resolve({
          ...args.data,
          updatedAt: new Date(),
        }),
      ),
      update: vi.fn().mockImplementation((args) =>
        Promise.resolve({
          id: args.where.id,
          ...args.data,
          updatedAt: new Date(),
        }),
      ),
    },
    globalConfig: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'global', killSwitch: false }),
      upsert: vi.fn().mockResolvedValue({ id: 'global', killSwitch: false }),
    },
  },
}));

import {
  isFeatureEnabled,
  updateFlag,
  activateKillSwitch,
  deactivateKillSwitch,
  setGlobalKillSwitch,
  isGlobalKillSwitchActive,
  getAllFlags,
  getFlag,
  setFlagStatus,
  _resetForTesting,
} from '../feature-flags-service';
import type { KnownFeatureFlag } from '../types';

describe('feature-flags-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to sync defaults (no DB)
    _resetForTesting();
  });

  describe('isFeatureEnabled', () => {
    it('returns enabled for active feature', () => {
      const result = isFeatureEnabled('voice_realtime');
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('enabled');
    });

    it('returns disabled for unknown feature', () => {
      const result = isFeatureEnabled('unknown_feature' as KnownFeatureFlag);
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('disabled');
    });

    it('respects kill-switch', async () => {
      await activateKillSwitch('voice_realtime', 'test');
      const result = isFeatureEnabled('voice_realtime');
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('kill_switch');
    });

    it('respects global kill-switch', async () => {
      await setGlobalKillSwitch(true, 'test');
      const result = isFeatureEnabled('voice_realtime');
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('kill_switch');
    });

    it('handles percentage rollout deterministically', async () => {
      await updateFlag('flashcards', { enabledPercentage: 50 });

      // Same user should get consistent result
      const result1 = isFeatureEnabled('flashcards', 'user-123');
      const result2 = isFeatureEnabled('flashcards', 'user-123');
      expect(result1.enabled).toBe(result2.enabled);
    });

    it('enables voice_ga_protocol by default', () => {
      const result = isFeatureEnabled('voice_ga_protocol');
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('enabled');
    });
  });

  describe('updateFlag', () => {
    it('updates flag status', async () => {
      const updated = await updateFlag('quiz', { status: 'disabled' });
      expect(updated?.status).toBe('disabled');

      const result = isFeatureEnabled('quiz');
      expect(result.enabled).toBe(false);
    });

    it('updates percentage rollout', async () => {
      const updated = await updateFlag('mindmap', { enabledPercentage: 25 });
      expect(updated?.enabledPercentage).toBe(25);
    });

    it('clamps percentage to 0-100', async () => {
      let updated = await updateFlag('mindmap', { enabledPercentage: 150 });
      expect(updated?.enabledPercentage).toBe(100);

      updated = await updateFlag('mindmap', { enabledPercentage: -10 });
      expect(updated?.enabledPercentage).toBe(0);
    });

    it('returns null for unknown flag', async () => {
      const result = await updateFlag('unknown' as KnownFeatureFlag, {
        status: 'disabled',
      });
      expect(result).toBeNull();
    });
  });

  describe('kill-switch', () => {
    it('activates kill-switch for feature', async () => {
      await activateKillSwitch('pdf_export', 'maintenance');
      const flag = getFlag('pdf_export');
      expect(flag?.killSwitch).toBe(true);
    });

    it('deactivates kill-switch for feature', async () => {
      await activateKillSwitch('pdf_export', 'maintenance');
      await deactivateKillSwitch('pdf_export');
      const flag = getFlag('pdf_export');
      expect(flag?.killSwitch).toBe(false);
    });

    it('global kill-switch overrides all', async () => {
      await setGlobalKillSwitch(true, 'emergency');
      expect(isGlobalKillSwitchActive()).toBe(true);

      // All features should be disabled
      const flags = getAllFlags();
      for (const flag of flags) {
        const result = isFeatureEnabled(flag.id as KnownFeatureFlag);
        expect(result.enabled).toBe(false);
      }
    });
  });

  describe('setFlagStatus', () => {
    it('sets flag to degraded state', async () => {
      await setFlagStatus('rag_enabled', 'degraded');
      const result = isFeatureEnabled('rag_enabled');
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('degraded');
    });
  });

  describe('getAllFlags', () => {
    it('returns all default flags', () => {
      const flags = getAllFlags();
      expect(flags.length).toBeGreaterThan(0);
      expect(flags.some((f) => f.id === 'voice_realtime')).toBe(true);
      expect(flags.some((f) => f.id === 'rag_enabled')).toBe(true);
    });
  });
});
