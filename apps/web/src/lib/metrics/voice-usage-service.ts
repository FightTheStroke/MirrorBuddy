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
import {
  queryUserVoiceSpend,
  queryVoiceSpendByUser,
  queryVoiceSpendSummary,
} from './voice-usage-queries';
import { dayKey, monthKey, windowStart, type Period, type UserVoiceSpend } from './voice-usage-types';

export interface RecordVoiceUsageInput {
  userId: string;
  sessionId: string;
  maestroId?: string | null;
  model: string;
  usage: unknown;
  isTestData?: boolean;
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

export { dayKey, monthKey, windowStart };
export type { Period, UserVoiceSpend };

/** What one user has spent on voice in the window. */
export const getUserVoiceSpend = (
  userId: string,
  period: Period = 'day',
  now: Date = new Date(),
): Promise<UserVoiceSpend> => queryUserVoiceSpend(prisma, userId, period, now);

/** Every user with voice spend in the window, dearest first. */
export const getVoiceSpendByUser = (
  period: Period = 'day',
  now: Date = new Date(),
  limit = 100,
): Promise<UserVoiceSpend[]> => queryVoiceSpendByUser(prisma, period, now, limit);

/** Totals plus a per-day series, for the admin console chart. */
export const getVoiceSpendSummary = (period: Period = 'month', now: Date = new Date()) =>
  queryVoiceSpendSummary(prisma, period, now);
