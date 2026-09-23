/**
 * Unit tests for Tier Engagement Metrics (DAU/WAU/MAU)
 * TDD: Write tests BEFORE implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { collectTierMetrics } from '../tier-metrics-collector';

// Mock prisma
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { prisma } from '@/lib/db';

describe('Tier Engagement Metrics (DAU/WAU/MAU)', () => {
  const instanceLabels = { instance: 'test', env: 'test' };
  const timestamp = 1234567890;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DAU/WAU/MAU metrics', () => {
    it('should return DAU (Daily Active Users) by tier', async () => {
      // Setup mocks
      vi.mocked(prisma.userSubscription.groupBy).mockResolvedValueOnce([
        { _count: { id: 10 }, tierId: 'tier-1' },
        { _count: { id: 8 }, tierId: 'tier-2' },
      ] as any);

      vi.mocked(prisma.tierDefinition.findMany).mockResolvedValueOnce([
        { id: 'tier-1', code: 'trial' },
        { id: 'tier-2', code: 'base' },
      ] as any);

      // One activity query for every tier: wau (7d), mau (30d), dau (1d), churned (30d+)
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
        { tierId: 'tier-1', wau: BigInt(9), mau: BigInt(10), dau: BigInt(6), churned: BigInt(1) },
        { tierId: 'tier-2', wau: BigInt(7), mau: BigInt(8), dau: BigInt(5), churned: BigInt(1) },
      ] as never);

      vi.mocked(prisma.tierAuditLog.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      // Mock tierAuditLog.findMany for tier changes (returns empty array)
      vi.mocked(prisma.tierAuditLog.findMany).mockResolvedValueOnce([] as any);

      // Mock second tierDefinition.findMany call for sortOrder map
      vi.mocked(prisma.tierDefinition.findMany).mockResolvedValueOnce([
        { id: 'tier-1', sortOrder: 1 },
        { id: 'tier-2', sortOrder: 2 },
      ] as any);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      const trialDAU = samples.find(
        (s) => s.name === 'mirrorbuddy_dau_by_tier' && s.labels.tier === 'trial',
      );
      expect(trialDAU).toBeDefined();
      expect(trialDAU?.value).toBe(6);

      const baseDAU = samples.find(
        (s) => s.name === 'mirrorbuddy_dau_by_tier' && s.labels.tier === 'base',
      );
      expect(baseDAU).toBeDefined();
      expect(baseDAU?.value).toBe(5);
    });

    it('should return WAU (Weekly Active Users) by tier', async () => {
      // Setup mocks
      vi.mocked(prisma.userSubscription.groupBy).mockResolvedValueOnce([
        { _count: { id: 10 }, tierId: 'tier-1' },
        { _count: { id: 8 }, tierId: 'tier-2' },
      ] as any);

      vi.mocked(prisma.tierDefinition.findMany).mockResolvedValueOnce([
        { id: 'tier-1', code: 'trial' },
        { id: 'tier-2', code: 'base' },
      ] as any);

      // One activity query for every tier: wau (7d), mau (30d), dau (1d), churned (30d+)
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
        { tierId: 'tier-1', wau: BigInt(9), mau: BigInt(10), dau: BigInt(6), churned: BigInt(1) },
        { tierId: 'tier-2', wau: BigInt(7), mau: BigInt(8), dau: BigInt(5), churned: BigInt(1) },
      ] as never);

      vi.mocked(prisma.tierAuditLog.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      // Mock tierAuditLog.findMany for tier changes (returns empty array)
      vi.mocked(prisma.tierAuditLog.findMany).mockResolvedValueOnce([] as any);

      // Mock second tierDefinition.findMany call for sortOrder map
      vi.mocked(prisma.tierDefinition.findMany).mockResolvedValueOnce([
        { id: 'tier-1', sortOrder: 1 },
        { id: 'tier-2', sortOrder: 2 },
      ] as any);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      const trialWAU = samples.find(
        (s) => s.name === 'mirrorbuddy_wau_by_tier' && s.labels.tier === 'trial',
      );
      expect(trialWAU).toBeDefined();
      expect(trialWAU?.value).toBe(9);

      const baseWAU = samples.find(
        (s) => s.name === 'mirrorbuddy_wau_by_tier' && s.labels.tier === 'base',
      );
      expect(baseWAU).toBeDefined();
      expect(baseWAU?.value).toBe(7);
    });

    it('should return MAU (Monthly Active Users) by tier', async () => {
      // Setup mocks
      vi.mocked(prisma.userSubscription.groupBy).mockResolvedValueOnce([
        { _count: { id: 10 }, tierId: 'tier-1' },
        { _count: { id: 8 }, tierId: 'tier-2' },
      ] as any);

      vi.mocked(prisma.tierDefinition.findMany).mockResolvedValueOnce([
        { id: 'tier-1', code: 'trial' },
        { id: 'tier-2', code: 'base' },
      ] as any);

      // One activity query for every tier: wau (7d), mau (30d), dau (1d), churned (30d+)
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
        { tierId: 'tier-1', wau: BigInt(9), mau: BigInt(10), dau: BigInt(6), churned: BigInt(1) },
        { tierId: 'tier-2', wau: BigInt(7), mau: BigInt(8), dau: BigInt(5), churned: BigInt(1) },
      ] as never);

      vi.mocked(prisma.tierAuditLog.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      // Mock tierAuditLog.findMany for tier changes (returns empty array)
      vi.mocked(prisma.tierAuditLog.findMany).mockResolvedValueOnce([] as any);

      // Mock second tierDefinition.findMany call for sortOrder map
      vi.mocked(prisma.tierDefinition.findMany).mockResolvedValueOnce([
        { id: 'tier-1', sortOrder: 1 },
        { id: 'tier-2', sortOrder: 2 },
      ] as any);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      const trialMAU = samples.find(
        (s) => s.name === 'mirrorbuddy_mau_by_tier' && s.labels.tier === 'trial',
      );
      expect(trialMAU).toBeDefined();
      expect(trialMAU?.value).toBe(10);

      const baseMAU = samples.find(
        (s) => s.name === 'mirrorbuddy_mau_by_tier' && s.labels.tier === 'base',
      );
      expect(baseMAU).toBeDefined();
      expect(baseMAU?.value).toBe(8);
    });

    it('should include DAU/WAU/MAU metrics in sample count', async () => {
      vi.mocked(prisma.userSubscription.groupBy).mockResolvedValueOnce([
        { _count: { id: 5 }, tierId: 'tier-1' },
      ] as any);

      vi.mocked(prisma.tierDefinition.findMany).mockResolvedValueOnce([
        { id: 'tier-1', code: 'trial' },
      ] as any);

      // One activity query for every tier: wau (7d), mau (30d), dau (1d), churned (30d+)
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
        { tierId: 'tier-1', wau: BigInt(4), mau: BigInt(5), dau: BigInt(3), churned: BigInt(1) },
      ] as never);

      vi.mocked(prisma.tierAuditLog.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      // Mock tierAuditLog.findMany for tier changes (returns empty array)
      vi.mocked(prisma.tierAuditLog.findMany).mockResolvedValueOnce([] as any);

      // Mock second tierDefinition.findMany call for sortOrder map
      vi.mocked(prisma.tierDefinition.findMany).mockResolvedValueOnce([
        { id: 'tier-1', sortOrder: 1 },
      ] as any);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      // Should include: users_by_tier, active_users_by_tier, total_active, wau, mau, dau, churned, churn_rate, upgrades, downgrades
      // = 8 (trial) + 1 (upgrades) + 1 (downgrades) = 10 samples
      const dauMetrics = samples.filter(
        (s) =>
          s.name === 'mirrorbuddy_dau_by_tier' ||
          s.name === 'mirrorbuddy_wau_by_tier' ||
          s.name === 'mirrorbuddy_mau_by_tier',
      );
      expect(dauMetrics.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle zero DAU/WAU/MAU values', async () => {
      vi.mocked(prisma.userSubscription.groupBy).mockResolvedValueOnce([
        { _count: { id: 5 }, tierId: 'tier-1' },
      ] as any);

      vi.mocked(prisma.tierDefinition.findMany).mockResolvedValueOnce([
        { id: 'tier-1', code: 'trial' },
      ] as any);

      // One activity query for every tier: wau (7d), mau (30d), dau (1d), churned (30d+)
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
        { tierId: 'tier-1', wau: BigInt(0), mau: BigInt(0), dau: BigInt(0), churned: BigInt(5) },
      ] as never);

      vi.mocked(prisma.tierAuditLog.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      // Mock tierAuditLog.findMany for tier changes (returns empty array)
      vi.mocked(prisma.tierAuditLog.findMany).mockResolvedValueOnce([] as any);

      // Mock second tierDefinition.findMany call for sortOrder map
      vi.mocked(prisma.tierDefinition.findMany).mockResolvedValueOnce([
        { id: 'tier-1', sortOrder: 1 },
      ] as any);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      const trialDAU = samples.find(
        (s) => s.name === 'mirrorbuddy_dau_by_tier' && s.labels.tier === 'trial',
      );
      expect(trialDAU?.value).toBe(0);

      const trialWAU = samples.find(
        (s) => s.name === 'mirrorbuddy_wau_by_tier' && s.labels.tier === 'trial',
      );
      expect(trialWAU?.value).toBe(0);

      const trialMAU = samples.find(
        (s) => s.name === 'mirrorbuddy_mau_by_tier' && s.labels.tier === 'trial',
      );
      expect(trialMAU?.value).toBe(0);
    });
  });
});
