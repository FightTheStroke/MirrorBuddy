/**
 * Tests for behavioral metrics - safety stats from SafetyEvent table
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/metrics/cost-tracking-service', () => ({
  getCostMetricsSummary: vi.fn().mockResolvedValue({
    avgCostText24h: 0.03,
    avgCostVoice24h: 0.1,
    spikesThisWeek: 0,
  }),
}));

import { prisma } from '@/lib/db';
import { generateBehavioralMetrics } from '../behavioral-metrics';

beforeEach(() => {
  vi.clearAllMocks();
  // Default: empty sessions and safety events
  vi.mocked(prisma.studySession.findMany).mockResolvedValue([]);
  vi.mocked(prisma.safetyEvent.findMany).mockResolvedValue([]);
});

describe('generateBehavioralMetrics - safety stats', () => {
  it('queries SafetyEvent table (not TelemetryEvent)', async () => {
    await generateBehavioralMetrics();

    expect(prisma.safetyEvent.findMany).toHaveBeenCalled();
    // TelemetryEvent should NOT be called for safety metrics
    expect(prisma.telemetryEvent.findMany).not.toHaveBeenCalled();
  });

  it('counts input_blocked and input_warned as refusals', async () => {
    vi.mocked(prisma.safetyEvent.findMany).mockResolvedValueOnce([
      { type: 'input_blocked', severity: 'warning', resolution: null },
      { type: 'input_warned', severity: 'info', resolution: null },
      { type: 'input_blocked', severity: 'alert', resolution: 'false_positive' },
      { type: 'jailbreak_attempt', severity: 'critical', resolution: null },
    ] as any);

    const metrics = await generateBehavioralMetrics();

    const refusalPrecision = metrics.find((m) => m.name === 'mirrorbuddy_refusal_precision');
    // 3 refusals total, 1 false positive → 2 correct / 3 total ≈ 0.667
    expect(refusalPrecision).toBeDefined();
    expect(refusalPrecision!.value).toBeCloseTo(2 / 3, 2);
  });

  it('maps severity to incident levels (S0-S3)', async () => {
    vi.mocked(prisma.safetyEvent.findMany).mockResolvedValueOnce([
      { type: 'pii_detected', severity: 'info', resolution: null },
      { type: 'profanity_detected', severity: 'warning', resolution: null },
      { type: 'crisis_detected', severity: 'alert', resolution: null },
      { type: 'session_terminated', severity: 'critical', resolution: null },
    ] as any);

    const metrics = await generateBehavioralMetrics();

    const s0 = metrics.find(
      (m) => m.name === 'mirrorbuddy_incidents_total' && m.labels.severity === 'S0',
    );
    const s1 = metrics.find(
      (m) => m.name === 'mirrorbuddy_incidents_total' && m.labels.severity === 'S1',
    );
    const s2 = metrics.find(
      (m) => m.name === 'mirrorbuddy_incidents_total' && m.labels.severity === 'S2',
    );
    const s3 = metrics.find(
      (m) => m.name === 'mirrorbuddy_incidents_total' && m.labels.severity === 'S3',
    );

    expect(s0!.value).toBe(1); // info
    expect(s1!.value).toBe(1); // warning
    expect(s2!.value).toBe(1); // alert
    expect(s3!.value).toBe(1); // critical
  });

  it('counts jailbreak attempts as blocked', async () => {
    vi.mocked(prisma.safetyEvent.findMany).mockResolvedValueOnce([
      { type: 'jailbreak_attempt', severity: 'alert', resolution: null },
      { type: 'jailbreak_attempt', severity: 'critical', resolution: null },
    ] as any);

    const metrics = await generateBehavioralMetrics();

    const blockRate = metrics.find((m) => m.name === 'mirrorbuddy_jailbreak_block_rate');
    // All jailbreak attempts are blocked → rate = 1.0
    expect(blockRate!.value).toBe(1);
  });

  it('returns 100% precision and block rate when no safety events', async () => {
    vi.mocked(prisma.safetyEvent.findMany).mockResolvedValueOnce([]);

    const metrics = await generateBehavioralMetrics();

    const refusalPrecision = metrics.find((m) => m.name === 'mirrorbuddy_refusal_precision');
    const blockRate = metrics.find((m) => m.name === 'mirrorbuddy_jailbreak_block_rate');

    // No events → default to 100% (safe default)
    expect(refusalPrecision!.value).toBe(1);
    expect(blockRate!.value).toBe(1);
  });
});
