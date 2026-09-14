import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import {
  getUsageHistory,
  getUsageMetrics,
  recordMessage,
  recordSessionStart,
  recordUsageTime,
} from './usage-tracker';

vi.mock('@/lib/db', () => ({
  prisma: { usagePattern: { upsert: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() } },
}));

const date = new Date('2026-09-14T00:00:00Z');
const pattern = {
  id: 'pattern',
  userId: 'student',
  date,
  sessionCount: 2,
  totalMinutes: 30,
  messageCount: 4,
  emotionalVentCount: 1,
  aiPreferenceCount: 2,
  nightMinutes: 10,
  weekdayAverage: null,
  stdDeviation: null,
  isTestData: false,
  createdAt: date,
  updatedAt: date,
};
const metrics = {
  userId: 'student',
  date,
  sessionCount: 2,
  totalMinutes: 30,
  messageCount: 4,
  emotionalVentCount: 1,
  aiPreferenceCount: 2,
  nightMinutes: 10,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 14, 12));
});
afterEach(() => vi.useRealTimers());

describe('dependency usage recording', () => {
  it('increments sessions with a UTC day key and initializes a new daily record', async () => {
    await recordSessionStart('student');
    expect(prisma.usagePattern.upsert).toHaveBeenCalledWith({
      where: { userId_date: { userId: 'student', date } },
      update: { sessionCount: { increment: 1 } },
      create: {
        userId: 'student',
        date,
        sessionCount: 1,
        totalMinutes: 0,
        messageCount: 0,
        emotionalVentCount: 0,
        aiPreferenceCount: 0,
        nightMinutes: 0,
      },
    });
  });

  it.each([
    ['Explain gravity', 0, 0],
    ['I feel lonely', 1, 0],
    ['I prefer talking to you', 0, 1],
    ['I feel lonely and I prefer talking to you', 1, 1],
  ] as const)(
    'records actual emotional detector outcomes for %s',
    async (message, vents, preferences) => {
      await recordMessage('student', message);
      expect(prisma.usagePattern.upsert).toHaveBeenCalledWith({
        where: { userId_date: { userId: 'student', date } },
        update: {
          messageCount: { increment: 1 },
          emotionalVentCount: vents ? { increment: 1 } : undefined,
          aiPreferenceCount: preferences ? { increment: 1 } : undefined,
        },
        create: {
          userId: 'student',
          date,
          sessionCount: 0,
          totalMinutes: 0,
          messageCount: 1,
          emotionalVentCount: vents,
          aiPreferenceCount: preferences,
          nightMinutes: 0,
        },
      });
      expect(JSON.stringify(vi.mocked(prisma.usagePattern.upsert).mock.calls)).not.toContain(
        message,
      );
    },
  );

  it.each([
    [5, 15],
    [6, 0],
    [21, 0],
    [22, 15],
    [23, 15],
  ])('records 15 minutes at hour %i with %i night minutes', async (hour, nightMinutes) => {
    vi.setSystemTime(new Date(2026, 8, 14, hour));
    await recordUsageTime('student', 15);
    expect(prisma.usagePattern.upsert).toHaveBeenCalledWith({
      where: { userId_date: { userId: 'student', date } },
      update: { totalMinutes: { increment: 15 }, nightMinutes: { increment: nightMinutes } },
      create: {
        userId: 'student',
        date,
        sessionCount: 0,
        totalMinutes: 15,
        messageCount: 0,
        emotionalVentCount: 0,
        aiPreferenceCount: 0,
        nightMinutes,
      },
    });
  });

  it('does not hide persistence failures', async () => {
    vi.mocked(prisma.usagePattern.upsert).mockRejectedValue(new Error('storage failed'));
    await expect(recordSessionStart('student')).rejects.toThrow('storage failed');
  });
});

describe('dependency usage retrieval', () => {
  it('returns null when today has no usage', async () => {
    vi.mocked(prisma.usagePattern.findUnique).mockResolvedValue(null);
    expect(await getUsageMetrics('student')).toBeNull();
    expect(prisma.usagePattern.findUnique).toHaveBeenCalledWith({
      where: { userId_date: { userId: 'student', date } },
    });
  });

  it('uses the requested date and exposes only usage metrics', async () => {
    vi.mocked(prisma.usagePattern.findUnique).mockResolvedValue(pattern);
    expect(await getUsageMetrics('student', date)).toEqual(metrics);
    expect(prisma.usagePattern.findUnique).toHaveBeenCalledWith({
      where: { userId_date: { userId: 'student', date } },
    });
  });

  it.each([undefined, 3])('loads chronological history with days=%s', async (days) => {
    vi.mocked(prisma.usagePattern.findMany).mockResolvedValue([pattern]);
    expect(await getUsageHistory('student', days)).toEqual([metrics]);
    expect(prisma.usagePattern.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'student',
        date: {
          gte: new Date(days === 3 ? '2026-09-11T00:00:00Z' : '2026-09-07T00:00:00Z'),
          lte: date,
        },
      },
      orderBy: { date: 'asc' },
    });
  });
});
