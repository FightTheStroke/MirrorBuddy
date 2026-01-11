/**
 * Session and Reminder Type Definitions
 * Scheduled sessions and custom reminders
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type RepeatFrequency = 'daily' | 'weekly' | 'weekdays' | 'none';

export interface ScheduledSession {
  id: string;
  userId: string;
  dayOfWeek: DayOfWeek;
  time: string;
  duration: number;
  subject: string;
  maestroId?: string;
  topic?: string;
  active: boolean;
  reminderOffset: number;
  repeat: RepeatFrequency;
}

export interface CustomReminder {
  id: string;
  userId: string;
  datetime: Date;
  message: string;
  repeat: RepeatFrequency;
  subject?: string;
  maestroId?: string;
  active: boolean;
  createdAt: Date;
}
