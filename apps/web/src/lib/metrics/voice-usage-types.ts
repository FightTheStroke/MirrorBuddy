/**
 * Shapes and window maths shared by the service, the queries, the admin console
 * and the CLI. Deliberately free of imports so a plain Node script can use it.
 */

export type Period = 'day' | 'week' | 'month';

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
