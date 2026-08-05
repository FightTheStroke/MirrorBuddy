/**
 * The contracts that make a cost dashboard trustworthy: a broken usage event
 * must never credit money back, cost accounting must never be able to break a
 * child's conversation, and the admin console and the CLI must agree because
 * they read the same numbers.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { prisma } from '@/lib/db';
import {
  dayKey,
  getVoiceSpendByUser,
  getVoiceSpendSummary,
  recordVoiceUsage,
  windowStart,
} from '../voice-usage-service';

const AZURE_USAGE = {
  input_token_details: { text_tokens: 100, audio_tokens: 2000, cached_tokens: 0 },
  output_token_details: { text_tokens: 50, audio_tokens: 3000 },
};

describe('recordVoiceUsage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stores a priced row from a real Azure usage block', async () => {
    vi.mocked(prisma.voiceUsageEvent.create).mockResolvedValue({} as never);

    const result = await recordVoiceUsage({
      userId: 'user-1',
      sessionId: 'sess-1',
      maestroId: 'loto',
      model: 'gpt-realtime',
      usage: AZURE_USAGE,
    });

    expect(result?.costEur).toBeGreaterThan(0);
    const row = vi.mocked(prisma.voiceUsageEvent.create).mock.calls[0][0].data;
    expect(row.audioOutputTokens).toBe(3000);
    expect(row.periodDay).toBe(dayKey(new Date()));
    expect(row.costEur).toBeGreaterThan(0);
  });

  it('stores nothing when a turn cost nothing', async () => {
    const result = await recordVoiceUsage({
      userId: 'user-1',
      sessionId: 'sess-1',
      model: 'gpt-realtime',
      usage: { input_token_details: {}, output_token_details: {} },
    });

    expect(result).toBeNull();
    expect(prisma.voiceUsageEvent.create).not.toHaveBeenCalled();
  });

  it('never lets accounting break a conversation', async () => {
    vi.mocked(prisma.voiceUsageEvent.create).mockRejectedValue(new Error('database on fire'));

    await expect(
      recordVoiceUsage({
        userId: 'user-1',
        sessionId: 'sess-1',
        model: 'gpt-realtime',
        usage: AZURE_USAGE,
      }),
    ).resolves.toBeNull(); // a lost row, not a silent robot
  });

  it('stores no transcript, ever', async () => {
    vi.mocked(prisma.voiceUsageEvent.create).mockResolvedValue({} as never);

    await recordVoiceUsage({
      userId: 'user-1',
      sessionId: 'sess-1',
      model: 'gpt-realtime',
      usage: { ...AZURE_USAGE, transcript: 'mi fa male la pancia' },
    });

    const row = JSON.stringify(vi.mocked(prisma.voiceUsageEvent.create).mock.calls[0][0].data);
    expect(row).not.toContain('pancia');
  });
});

describe('windowStart', () => {
  const now = new Date('2026-08-05T14:00:00.000Z');

  it('counts a day from midnight, not from 24 hours ago', () => {
    expect(windowStart('day', now).toISOString()).toBe('2026-08-05T00:00:00.000Z');
  });

  it('counts a month from the first of the month', () => {
    expect(windowStart('month', now).toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });

  it('counts a week as the last seven days', () => {
    expect(windowStart('week', now).toISOString()).toBe('2026-07-29T14:00:00.000Z');
  });
});

describe('getVoiceSpendByUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ranks the most expensive user first and counts sessions, not turns', async () => {
    vi.mocked(prisma.voiceUsageEvent.findMany).mockResolvedValue([
      {
        userId: 'cheap',
        sessionId: 's1',
        audioInputTokens: 10,
        audioOutputTokens: 10,
        costEur: 0.01,
        user: { email: 'a@b.c', name: 'A' },
      },
      {
        userId: 'dear',
        sessionId: 's2',
        audioInputTokens: 100,
        audioOutputTokens: 6000,
        costEur: 0.5,
        user: { email: 'd@b.c', name: 'D' },
      },
      {
        userId: 'dear',
        sessionId: 's2',
        audioInputTokens: 100,
        audioOutputTokens: 6000,
        costEur: 0.5,
        user: { email: 'd@b.c', name: 'D' },
      },
    ] as never);

    const rows = await getVoiceSpendByUser('day');

    expect(rows[0].userId).toBe('dear');
    expect(rows[0].costEur).toBeCloseTo(1.0, 4);
    expect(rows[0].sessions).toBe(1); // two turns of one session
    expect(rows[0].spokenMinutes).toBeGreaterThan(0);
  });

  it('excludes test data, so the bill is not inflated by CI', async () => {
    vi.mocked(prisma.voiceUsageEvent.findMany).mockResolvedValue([] as never);

    await getVoiceSpendByUser('month');

    const where = vi.mocked(prisma.voiceUsageEvent.findMany).mock.calls[0]?.[0]?.where;
    expect(where?.isTestData).toBe(false);
  });
});

describe('getVoiceSpendSummary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports cost per active user, which is the number worth watching', async () => {
    vi.mocked(prisma.voiceUsageEvent.findMany).mockResolvedValue([
      { userId: 'u1', costEur: 1, periodDay: '2026-08-04' },
      { userId: 'u2', costEur: 3, periodDay: '2026-08-05' },
    ] as never);

    const summary = await getVoiceSpendSummary('month');

    expect(summary.totalCostEur).toBe(4);
    expect(summary.activeUsers).toBe(2);
    expect(summary.costPerUserEur).toBe(2);
    expect(summary.byDay.map((d) => d.day)).toEqual(['2026-08-04', '2026-08-05']);
  });

  it('does not divide by zero on a quiet month', async () => {
    vi.mocked(prisma.voiceUsageEvent.findMany).mockResolvedValue([] as never);

    const summary = await getVoiceSpendSummary('month');

    expect(summary.costPerUserEur).toBe(0);
  });
});
