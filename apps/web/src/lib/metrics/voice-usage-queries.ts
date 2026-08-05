/**
 * Voice spend queries, with the Prisma client passed in.
 *
 * Kept apart from `voice-usage-service` because that module imports the Next
 * app's db shim, which imports `server-only` and therefore throws the moment a
 * plain Node script touches it. The CLI needs the same numbers as the admin
 * console; it must not need Next to get them.
 */

import type { Period, UserVoiceSpend } from './voice-usage-types';
import { windowStart } from './voice-usage-types';

/**
 * The slice of Prisma these queries need — anything shaped like this will do.
 *
 * Deliberately method syntax: Prisma's `findMany` is generic and constrained,
 * so a property-syntax signature is checked contravariantly and the real client
 * would not be assignable to it.
 */
export interface VoiceUsageDb {
  voiceUsageEvent: {
    findMany(args: unknown): Promise<unknown[]>;
  };
}

const AUDIO_TOKENS_PER_SECOND = 10;

const round = (value: number): number => Math.round(value * 10_000) / 10_000;

interface SpendRow {
  sessionId: string;
  audioInputTokens: number;
  audioOutputTokens: number;
  costEur: number;
}

function summarise(
  userId: string,
  email: string | null,
  name: string | null,
  rows: SpendRow[],
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

/** What one user has spent on voice in the window. */
export async function queryUserVoiceSpend(
  db: VoiceUsageDb,
  userId: string,
  period: Period = 'day',
  now: Date = new Date(),
): Promise<UserVoiceSpend> {
  const rows = (await db.voiceUsageEvent.findMany({
    where: { userId, isTestData: false, createdAt: { gte: windowStart(period, now) } },
    select: {
      sessionId: true,
      audioInputTokens: true,
      audioOutputTokens: true,
      costEur: true,
    },
  })) as SpendRow[];

  return summarise(userId, null, null, rows);
}

/** Every user with voice spend in the window, dearest first. */
export async function queryVoiceSpendByUser(
  db: VoiceUsageDb,
  period: Period = 'day',
  now: Date = new Date(),
  limit = 100,
): Promise<UserVoiceSpend[]> {
  const rows = (await db.voiceUsageEvent.findMany({
    where: { isTestData: false, createdAt: { gte: windowStart(period, now) } },
    select: {
      userId: true,
      sessionId: true,
      audioInputTokens: true,
      audioOutputTokens: true,
      costEur: true,
      user: { select: { email: true, username: true } },
    },
  })) as (SpendRow & {
    userId: string;
    user?: { email: string | null; username: string | null } | null;
  })[];

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
export async function queryVoiceSpendSummary(
  db: VoiceUsageDb,
  period: Period = 'month',
  now: Date = new Date(),
): Promise<{
  totalCostEur: number;
  activeUsers: number;
  costPerUserEur: number;
  byDay: { day: string; costEur: number }[];
}> {
  const rows = (await db.voiceUsageEvent.findMany({
    where: { isTestData: false, createdAt: { gte: windowStart(period, now) } },
    select: { userId: true, costEur: true, periodDay: true },
  })) as { userId: string; costEur: number; periodDay: string }[];

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
