/**
 * Scheduler Effects Setup
 * Handles periodic checking and initial fetch effects
 */

'use client';

/**
 * Setup function for periodic check interval
 * Returns cleanup function
 */
export function setupPeriodicChecking(
  checkDue: () => Promise<void>,
  checkInterval: number
): () => void {
  const timer = setInterval(checkDue, checkInterval);
  return () => clearInterval(timer);
}

/**
 * Update local schedule state after API operation
 */
export function updateScheduleState(
  prevSchedule: any,
  updater: (schedule: any) => any
): any {
  if (!prevSchedule) return prevSchedule;
  return updater(prevSchedule);
}

/**
 * Update schedule with new session
 */
export function addSessionToSchedule(prevSchedule: any, session: any): any {
  return updateScheduleState(prevSchedule, (schedule) => ({
    ...schedule,
    weeklyPlan: [...schedule.weeklyPlan, session],
  }));
}

/**
 * Update schedule session by ID
 */
export function updateSessionInSchedule(
  prevSchedule: any,
  sessionId: string,
  session: any
): any {
  return updateScheduleState(prevSchedule, (schedule) => ({
    ...schedule,
    weeklyPlan: schedule.weeklyPlan.map((s: any) =>
      s.id === sessionId ? session : s
    ),
  }));
}

/**
 * Remove session from schedule
 */
export function removeSessionFromSchedule(
  prevSchedule: any,
  sessionId: string
): any {
  return updateScheduleState(prevSchedule, (schedule) => ({
    ...schedule,
    weeklyPlan: schedule.weeklyPlan.filter((s: any) => s.id !== sessionId),
  }));
}

/**
 * Add reminder to schedule
 */
export function addReminderToSchedule(prevSchedule: any, reminder: any): any {
  return updateScheduleState(prevSchedule, (schedule) => ({
    ...schedule,
    customReminders: [...schedule.customReminders, reminder],
  }));
}

/**
 * Update reminder by ID
 */
export function updateReminderInSchedule(
  prevSchedule: any,
  reminderId: string,
  reminder: any
): any {
  return updateScheduleState(prevSchedule, (schedule) => ({
    ...schedule,
    customReminders: schedule.customReminders.map((r: any) =>
      r.id === reminderId ? reminder : r
    ),
  }));
}

/**
 * Remove reminder from schedule
 */
export function removeReminderFromSchedule(
  prevSchedule: any,
  reminderId: string
): any {
  return updateScheduleState(prevSchedule, (schedule) => ({
    ...schedule,
    customReminders: schedule.customReminders.filter(
      (r: any) => r.id !== reminderId
    ),
  }));
}

/**
 * Update preferences in schedule
 */
export function updatePreferencesInSchedule(
  prevSchedule: any,
  preferences: any
): any {
  return updateScheduleState(prevSchedule, (schedule) => ({
    ...schedule,
    preferences,
  }));
}
