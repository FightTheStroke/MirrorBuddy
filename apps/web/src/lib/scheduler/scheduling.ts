/**
 * Scheduling Logic
 * Functions for calculating scheduled session occurrences
 */

import type { ScheduledSession } from './types';

/**
 * Get the next occurrence of a scheduled session
 */
export function getNextSessionOccurrence(session: ScheduledSession): Date {
  const now = new Date();
  const [hours, minutes] = session.time.split(':').map(Number);

  // Find the next occurrence of this day of week
  const daysUntil = (session.dayOfWeek - now.getDay() + 7) % 7;
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + (daysUntil === 0 && now.getHours() * 60 + now.getMinutes() >= hours * 60 + minutes ? 7 : daysUntil));
  nextDate.setHours(hours, minutes, 0, 0);

  return nextDate;
}
