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
import { voiceUsageKey, VoiceUsageConflictError } from './voice-usage-identity';
import { isVoiceUsageId } from './voice-usage-validation';
import { parseRealtimeUsage, priceUsage, type TokenUsage } from './voice-pricing';
import {
  queryUserVoiceSpend,
  queryVoiceSpendByUser,
  queryVoiceSpendSummary,
} from './voice-usage-queries';
import {
  dayKey,
  monthKey,
  windowStart,
  type Period,
  type UserVoiceSpend,
} from './voice-usage-types';

export interface RecordVoiceUsageInput {
  userId: string;
  sessionId: string;
  responseId?: string;
  maestroId?: string | null;
  model: string;
  usage: unknown;
  isTestData?: boolean;
}

/**
 * Stores one priced turn.
 *
 * Storage failures propagate to the API, which returns a retryable failure.
 * The browser isolates accounting failures from the conversation.
 */
export async function recordVoiceUsage(
  input: RecordVoiceUsageInput | null | undefined,
): Promise<{ costEur: number; tokens: TokenUsage } | null> {
  try {
    if (
      !input ||
      !isVoiceUsageId(input.userId) ||
      !isVoiceUsageId(input.sessionId) ||
      (input.responseId !== undefined && !isVoiceUsageId(input.responseId))
    ) {
      throw new Error('Invalid voice usage identity');
    }
    const tokens = parseRealtimeUsage(input.usage);
    const billable =
      tokens.audioInputTokens +
      tokens.audioOutputTokens +
      tokens.textInputTokens +
      tokens.textOutputTokens;
    if (billable <= 0) return null; // nothing was spent, nothing to store

    const priced = priceUsage(input.model, tokens);
    const now = new Date();

    const id = input.responseId
      ? voiceUsageKey(input.userId, input.sessionId, input.responseId)
      : undefined;
    const data = {
      id,
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
    };
    try {
      await prisma.voiceUsageEvent.create({ data });
    } catch (error) {
      if (
        !id ||
        !error ||
        typeof error !== 'object' ||
        !('code' in error) ||
        error.code !== 'P2002'
      )
        throw error;
      const existing = await prisma.voiceUsageEvent.findUnique({ where: { id } });
      if (!existing) throw error;
      if (
        existing.userId !== data.userId ||
        existing.sessionId !== data.sessionId ||
        existing.maestroId !== data.maestroId ||
        existing.model !== data.model ||
        existing.audioInputTokens !== data.audioInputTokens ||
        existing.audioOutputTokens !== data.audioOutputTokens ||
        existing.textInputTokens !== data.textInputTokens ||
        existing.textOutputTokens !== data.textOutputTokens ||
        existing.cachedInputTokens !== data.cachedInputTokens
      ) {
        throw new VoiceUsageConflictError();
      }
      return { costEur: existing.costEur, tokens };
    }

    return { costEur: priced.totalCostEur, tokens };
  } catch (error) {
    logger.error('[VoiceUsage] Failed to record usage', undefined, error);
    throw error;
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
