/**
 * Summary and Configuration Type Definitions
 * Weekly summaries and scheduler configuration
 */

import type { NotificationPreferences } from './preferences-types';
import type { ScheduledSession, CustomReminder } from './session-types';

export interface WeeklySummary {
  weekStart: Date;
  totalMinutes: number;
  sessionsCompleted: number;
  sessionsMissed: number;
  xpEarned: number;
  flashcardsReviewed: number;
  streak: number;
  subjects: string[];
  topSubject?: string;
  weakArea?: string;
}

export interface StudySchedule {
  userId: string;
  weeklyPlan: ScheduledSession[];
  customReminders: CustomReminder[];
  preferences: NotificationPreferences;
  updatedAt: Date;
}

export interface SchedulerConfig {
  checkInterval: number;
  defaultReminderOffset: number;
  maxNotificationsPerDay: number;
  defaultStreakWarningTime: string;
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  checkInterval: 60000,
  defaultReminderOffset: 5,
  maxNotificationsPerDay: 10,
  defaultStreakWarningTime: '21:00',
};
