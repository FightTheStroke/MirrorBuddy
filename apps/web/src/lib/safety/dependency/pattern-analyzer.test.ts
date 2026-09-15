import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeUserPatterns, analyzeWeeklyEmotionalPatterns } from './pattern-analyzer';
import { getUsageHistory, getUsageMetrics } from './usage-tracker';
import type { UsageMetrics } from './types';

vi.mock('./usage-tracker', () => ({ getUsageHistory: vi.fn(), getUsageMetrics: vi.fn() }));

const metrics = (overrides: Partial<UsageMetrics> = {}): UsageMetrics => ({
  userId: 'student',
  date: new Date('2026-09-14T00:00:00Z'),
  sessionCount: 1,
  totalMinutes: 0,
  messageCount: 1,
  emotionalVentCount: 0,
  aiPreferenceCount: 0,
  nightMinutes: 0,
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getUsageHistory).mockResolvedValue([]);
  vi.mocked(getUsageMetrics).mockResolvedValue(null);
});

describe('daily dependency analysis', () => {
  it('returns a neutral result when no usage is recorded', async () => {
    expect(await analyzeUserPatterns('student')).toEqual({
      userId: 'student',
      weekdayAverage: 0,
      stdDeviation: 0,
      isAnomaly: false,
      sigmaDeviation: 0,
      alerts: [],
    });
    expect(getUsageHistory).toHaveBeenCalledWith('student', 7);
    expect(getUsageMetrics).toHaveBeenCalledWith('student');
  });

  it.each([
    [119, null],
    [120, 'warning'],
    [179, 'warning'],
    [180, 'concern'],
    [239, 'concern'],
    [240, 'critical'],
  ] as const)('classifies %i daily minutes as %s', async (totalMinutes, severity) => {
    vi.mocked(getUsageMetrics).mockResolvedValue(metrics({ totalMinutes }));
    const { alerts } = await analyzeUserPatterns('student');
    expect(alerts).toEqual(
      severity
        ? [
            expect.objectContaining({
              userId: 'student',
              alertType: 'excessive_usage',
              severity,
              triggerValue: totalMinutes,
              threshold: severity === 'critical' ? 240 : severity === 'concern' ? 180 : 120,
            }),
          ]
        : [],
    );
  });

  it.each([
    [7, null],
    [8, 'warning'],
    [11, 'warning'],
    [12, 'concern'],
    [19, 'concern'],
    [20, 'critical'],
  ] as const)('classifies %i sessions as %s', async (sessionCount, severity) => {
    vi.mocked(getUsageMetrics).mockResolvedValue(metrics({ sessionCount }));
    const { alerts } = await analyzeUserPatterns('student');
    expect(alerts).toEqual(
      severity
        ? [
            expect.objectContaining({
              alertType: 'excessive_usage',
              severity,
              triggerValue: sessionCount,
              threshold: severity === 'critical' ? 20 : severity === 'concern' ? 12 : 8,
            }),
          ]
        : [],
    );
  });

  it.each([
    [19, null],
    [20, 'warning'],
    [34, 'warning'],
    [35, 'concern'],
    [49, 'concern'],
    [50, 'critical'],
  ] as const)('classifies %i percent night usage as %s', async (nightMinutes, severity) => {
    vi.mocked(getUsageMetrics).mockResolvedValue(metrics({ totalMinutes: 100, nightMinutes }));
    const { alerts } = await analyzeUserPatterns('student');
    expect(alerts).toEqual(
      severity
        ? [
            expect.objectContaining({
              alertType: 'night_usage',
              severity,
              triggerValue: nightMinutes,
              threshold: severity === 'critical' ? 50 : severity === 'concern' ? 35 : 20,
            }),
          ]
        : [],
    );
  });

  it.each([{ values: [] }, { values: [10] }, { values: [10, 10] }])(
    'avoids false anomalies with a zero-variance history $values',
    async ({ values }) => {
      vi.mocked(getUsageHistory).mockResolvedValue(
        values.map((totalMinutes) => metrics({ totalMinutes })),
      );
      vi.mocked(getUsageMetrics).mockResolvedValue(metrics({ totalMinutes: 100 }));
      expect(await analyzeUserPatterns('student')).toMatchObject({
        stdDeviation: 0,
        sigmaDeviation: 0,
        isAnomaly: false,
        alerts: [],
      });
    },
  );

  it.each([
    [35, 2.5, true, 1],
    [34, 2.4, false, 0],
    [0, -1, false, 0],
  ] as const)(
    'compares %i minutes with the population deviation',
    async (totalMinutes, sigma, anomaly, count) => {
      vi.mocked(getUsageHistory).mockResolvedValue([
        metrics({ totalMinutes: 0 }),
        metrics({ totalMinutes: 20 }),
      ]);
      vi.mocked(getUsageMetrics).mockResolvedValue(metrics({ totalMinutes }));
      const result = await analyzeUserPatterns('student');
      expect(result.weekdayAverage).toBe(10);
      expect(result.stdDeviation).toBe(10);
      expect(result.sigmaDeviation).toBe(sigma);
      expect(result.isAnomaly).toBe(anomaly);
      expect(result.alerts).toHaveLength(count);
      if (count)
        expect(result.alerts[0]).toMatchObject({ severity: 'warning', sigmaDeviation: 2.5 });
    },
  );

  it('does not warn about excessive use for a downward anomaly', async () => {
    vi.mocked(getUsageHistory).mockResolvedValue([
      metrics({ totalMinutes: 90 }),
      metrics({ totalMinutes: 110 }),
    ]);
    expect(await analyzeUserPatterns('student')).toMatchObject({
      isAnomaly: true,
      sigmaDeviation: -10,
      alerts: [],
    });
  });

  it('propagates storage errors instead of returning a healthy result', async () => {
    vi.mocked(getUsageHistory).mockRejectedValue(new Error('storage unavailable'));
    await expect(analyzeUserPatterns('student')).rejects.toThrow('storage unavailable');
  });
});

describe('weekly emotional dependency analysis', () => {
  it('does not alert with no history', async () => {
    expect(await analyzeWeeklyEmotionalPatterns('student')).toEqual([]);
  });

  it.each([
    [2, 1, []],
    [3, 2, ['warning', 'warning']],
    [9, 6, ['warning', 'warning']],
    [10, 7, ['critical', 'critical']],
  ] as const)(
    'aggregates vents=%i and preferences=%i across days',
    async (vents, preferences, severities) => {
      vi.mocked(getUsageHistory).mockResolvedValue([
        metrics({ emotionalVentCount: 1, aiPreferenceCount: 1 }),
        metrics({ emotionalVentCount: vents - 1, aiPreferenceCount: preferences - 1 }),
      ]);
      const alerts = await analyzeWeeklyEmotionalPatterns('student');
      expect(alerts.map((alert) => alert.severity)).toEqual(severities);
      if (severities.length) {
        expect(
          alerts.map(({ alertType, triggerValue, threshold }) => ({
            alertType,
            triggerValue,
            threshold,
          })),
        ).toEqual([
          { alertType: 'emotional_venting', triggerValue: vents, threshold: vents >= 10 ? 10 : 3 },
          {
            alertType: 'ai_preference',
            triggerValue: preferences,
            threshold: preferences >= 7 ? 7 : 2,
          },
        ]);
      }
    },
  );
});
