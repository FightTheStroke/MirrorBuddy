/**
 * Scheduler Effects Setup
 * Handles periodic checking and initial fetch effects
 */

'use client';

import type {
  StudySchedule,
  ScheduledSession,
  CustomReminder,
  NotificationPreferences,
} from '@/lib/scheduler/types';

/**
 * Setup function for periodic check interval
 * Returns cleanup function
 */
export function setupPeriodicChecking(
  checkDue: () => Promise<unknown>,
  checkInterval: number
): () => void {
  const timer = setInterval(checkDue, checkInterval);
  return () => clearInterval(timer);
}

/**
 * Update local schedule state after API operation
 */
export function updateScheduleState(
  prevSchedule: StudySchedule | null,
  updater: (schedule: StudySchedule) => StudySchedule
): StudySchedule | null {
  if (!prevSchedule) return prevSchedule;
  return updater(prevSchedule);
}

/**
 * Update schedule with new session
 */
export function addSessionToSchedule(
  prevSchedule: StudySchedule | null,
  session: ScheduledSession
): StudySchedule | null {
  return updateScheduleState(prevSchedule, (schedule) => ({
    ...schedule,
    weeklyPlan: [...schedule.weeklyPlan, session],
  }));
}

/**
 * Update schedule session by ID
 */
export function updateSessionInSchedule(
  prevSchedule: StudySchedule | null,
  sessionId: string,
  session: ScheduledSession
): StudySchedule | null {
  return updateScheduleState(prevSchedule, (schedule) => ({
    ...schedule,
    weeklyPlan: schedule.weeklyPlan.map((s) =>
      s.id === sessionId ? session : s
    ),
  }));
}

/**
 * Remove session from schedule
 */
export function removeSessionFromSchedule(
  prevSchedule: StudySchedule | null,
  sessionId: string
): StudySchedule | null {
  return updateScheduleState(prevSchedule, (schedule) => ({
    ...schedule,
    weeklyPlan: schedule.weeklyPlan.filter((s) => s.id !== sessionId),
  }));
}

/**
 * Add reminder to schedule
 */
export function addReminderToSchedule(
  prevSchedule: StudySchedule | null,
  reminder: CustomReminder
): StudySchedule | null {
  return updateScheduleState(prevSchedule, (schedule) => ({
    ...schedule,
    customReminders: [...schedule.customReminders, reminder],
  }));
}

/**
 * Update reminder by ID
 */
export function updateReminderInSchedule(
  prevSchedule: StudySchedule | null,
  reminderId: string,
  reminder: CustomReminder
): StudySchedule | null {
  return updateScheduleState(prevSchedule, (schedule) => ({
    ...schedule,
    customReminders: schedule.customReminders.map((r) =>
      r.id === reminderId ? reminder : r
    ),
  }));
}

/**
 * Remove reminder from schedule
 */
export function removeReminderFromSchedule(
  prevSchedule: StudySchedule | null,
  reminderId: string
): StudySchedule | null {
  return updateScheduleState(prevSchedule, (schedule) => ({
    ...schedule,
    customReminders: schedule.customReminders.filter(
      (r) => r.id !== reminderId
    ),
  }));
}

/**
 * Update preferences in schedule
 */
export function updatePreferencesInSchedule(
  prevSchedule: StudySchedule | null,
  preferences: NotificationPreferences
): StudySchedule | null {
  return updateScheduleState(prevSchedule, (schedule) => ({
    ...schedule,
    preferences,
  }));
}
