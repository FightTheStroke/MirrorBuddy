/**
 * Per-user voice spend, by day, week and month.
 *
 * The question Roberto asked — "how much are we spending on voice, per user,
 * per day" — had no answer before this: `voiceMinutes` was never written, so
 * every voice cost in the database was zero. These functions answer it from
 * real Azure usage blocks, and they are shared by the admin console and the
 * CLI so the two can never disagree.
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { parseRealtimeUsage, priceUsage, type TokenUsage } from './voice-pricing';

export type Period = 'day' | 'week' | 'month';

export interface RecordVoiceUsageInput {
  userId: string;
  sessionId: string;
  maestroId?: string | null;
  model: string;
  usage: unknown;
  isTestData?: boolean;
}

export interface UserVoiceSpend {
  userId: string;
  email: string | null;
  name: string | null;
  sessions: number;
  audioInputTokens: number;
  audioOutputTokens: number;
  costEur: number;
  /** Roughly how long the maestro spoke, at ~10 audio tokens per second. */
  spokenMinutes: number;
}

const AUDIO_TOKENS_PER_SECOND = 10;

export function dayKey(when: Date): string {
  return when.toISOString().slice(0, 10);
}

export function monthKey(when: Date): string {
  return when.toISOString().slice(0, 7);
}

/** Start of the window, inclusive. Weeks are the last 7 days, not ISO weeks. */
export function windowStart(period: Period, now: Date = new Date()): Date {
  const start = new Date(now);
  if (period === 'day') start.setUTCHours(0, 0, 0, 0);
  if (period === 'week') start.setUTCDate(start.getUTCDate() - 7);
  if (period === 'month') {
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
  }
  return start;
}

/**
 * Stores one priced turn.
 *
 * Never throws: cost accounting must not be able to break a child's
 * conversation. A lost row is a small accounting error; a thrown exception in
 * the voice path is a robot that stops talking.
 */
export async function recordVoiceUsage(
  input: RecordVoiceUsageInput,
): Promise<{ costEur: number; tokens: TokenUsage } | null> {
  try {
    const tokens = parseRealtimeUsage(input.usage);
    const billable =
      tokens.audioInputTokens +
      tokens.audioOutputTokens +
      tokens.textInputTokens +
      tokens.textOutputTokens;
    if (billable <= 0) return null; // nothing was spent, nothing to store

    const priced = priceUsage(input.model, tokens);
    const now = new Date();

    await prisma.voiceUsageEvent.create({
      data: {
        userId: input.userId,
        sessionId: input.sessionId,
        maestroId: input.maestroId ?? null,
        model: input.model,
        audioInputTokens: tokens.audioInputTokens,
        audioOutputTokens: tokens.audioOutputTokens,
        textInputTokens: tokens.textInputTokens,
        textOutputTokens: tokens.textOutputTokens,
        cachedInputTokens: tokens.cachedInputTokens,
        costEur: priced.totalCostEur,
        periodDay: dayKey(now),
        periodMonth: monthKey(now),
        isTestData: input.isTestData ?? false,
      },
    });

    return { costEur: priced.totalCostEur, tokens };
  } catch (error) {
    logger.error('[VoiceUsage] Failed to record usage', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** What one user has spent on voice in the window. */
export async function getUserVoiceSpend(
  userId: string,
  period: Period = 'day',
  now: Date = new Date(),
): Promise<UserVoiceSpend> {
  const rows = await prisma.voiceUsageEvent.findMany({
    where: { userId, isTestData: false, createdAt: { gte: windowStart(period, now) } },
    select: {
      sessionId: true,
      audioInputTokens: true,
      audioOutputTokens: true,
      costEur: true,
    },
  });

  return summarise(userId, null, null, rows);
}

/** Every user with voice spend in the window, dearest first. */
export async function getVoiceSpendByUser(
  period: Period = 'day',
  now: Date = new Date(),
  limit = 100,
): Promise<UserVoiceSpend[]> {
  const rows = await prisma.voiceUsageEvent.findMany({
    where: { isTestData: false, createdAt: { gte: windowStart(period, now) } },
    select: {
      userId: true,
      sessionId: true,
      audioInputTokens: true,
      audioOutputTokens: true,
      costEur: true,
      user: { select: { email: true, username: true } },
    },
  });

  const byUser = new Map<string, typeof rows>();
  for (const row of rows) {
    const bucket = byUser.get(row.userId) ?? [];
    bucket.push(row);
    byUser.set(row.userId, bucket);
  }

  return [...byUser.entries()]
    .map(([userId, userRows]) =>
      summarise(
        userId,
        userRows[0]?.user?.email ?? null,
        userRows[0]?.user?.username ?? null,
        userRows,
      ),
    )
    .sort((a, b) => b.costEur - a.costEur)
    .slice(0, limit);
}

/** Totals plus a per-day series, for the admin console chart. */
export async function getVoiceSpendSummary(
  period: Period = 'month',
  now: Date = new Date(),
): Promise<{
  totalCostEur: number;
  activeUsers: number;
  costPerUserEur: number;
  byDay: { day: string; costEur: number }[];
}> {
  const rows = await prisma.voiceUsageEvent.findMany({
    where: { isTestData: false, createdAt: { gte: windowStart(period, now) } },
    select: { userId: true, costEur: true, periodDay: true },
  });

  const perDay = new Map<string, number>();
  const users = new Set<string>();
  let totalCostEur = 0;

  for (const row of rows) {
    totalCostEur += row.costEur;
    users.add(row.userId);
    perDay.set(row.periodDay, (perDay.get(row.periodDay) ?? 0) + row.costEur);
  }

  return {
    totalCostEur: round(totalCostEur),
    activeUsers: users.size,
    costPerUserEur: users.size ? round(totalCostEur / users.size) : 0,
    byDay: [...perDay.entries()]
      .map(([day, costEur]) => ({ day, costEur: round(costEur) }))
      .sort((a, b) => a.day.localeCompare(b.day)),
  };
}

function summarise(
  userId: string,
  email: string | null,
  name: string | null,
  rows: {
    sessionId: string;
    audioInputTokens: number;
    audioOutputTokens: number;
    costEur: number;
  }[],
): UserVoiceSpend {
  const sessions = new Set(rows.map((row) => row.sessionId));
  const audioInputTokens = rows.reduce((sum, row) => sum + row.audioInputTokens, 0);
  const audioOutputTokens = rows.reduce((sum, row) => sum + row.audioOutputTokens, 0);
  const costEur = rows.reduce((sum, row) => sum + row.costEur, 0);

  return {
    userId,
    email,
    name,
    sessions: sessions.size,
    audioInputTokens,
    audioOutputTokens,
    costEur: round(costEur),
    spokenMinutes: round(audioOutputTokens / AUDIO_TOKENS_PER_SECOND / 60),
  };
}

const round = (value: number): number => Math.round(value * 10000) / 10000;
