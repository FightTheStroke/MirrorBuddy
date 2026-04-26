/**
 * Entity Creators
 * Functions that create domain objects (sessions, reminders, schedules)
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  StudySchedule,
  ScheduledSession,
  CustomReminder,
  DayOfWeek,
  RepeatFrequency,
} from './types';
import { DEFAULT_NOTIFICATION_PREFERENCES, DEFAULT_SCHEDULER_CONFIG } from './types';

/**
 * Create a new scheduled session
 */
export function createScheduledSession(params: {
  userId: string;
  dayOfWeek: DayOfWeek;
  time: string;
  subject: string;
  duration?: number;
  maestroId?: string;
  topic?: string;
  reminderOffset?: number;
  repeat?: RepeatFrequency;
}): ScheduledSession {
  return {
    id: uuidv4(),
    userId: params.userId,
    dayOfWeek: params.dayOfWeek,
    time: params.time,
    duration: params.duration ?? 30,
    subject: params.subject,
    maestroId: params.maestroId,
    topic: params.topic,
    active: true,
    reminderOffset: params.reminderOffset ?? DEFAULT_SCHEDULER_CONFIG.defaultReminderOffset,
    repeat: params.repeat ?? 'weekly',
  };
}

/**
 * Create a custom reminder
 */
export function createCustomReminder(params: {
  userId: string;
  datetime: Date;
  message: string;
  subject?: string;
  maestroId?: string;
  repeat?: RepeatFrequency;
}): CustomReminder {
  return {
    id: uuidv4(),
    userId: params.userId,
    datetime: params.datetime,
    message: params.message,
    subject: params.subject,
    maestroId: params.maestroId,
    repeat: params.repeat ?? 'none',
    active: true,
    createdAt: new Date(),
  };
}

/**
 * Create a new study schedule with defaults
 */
export function createStudySchedule(userId: string): StudySchedule {
  return {
    userId,
    weeklyPlan: [],
    customReminders: [],
    preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    updatedAt: new Date(),
  };
}
