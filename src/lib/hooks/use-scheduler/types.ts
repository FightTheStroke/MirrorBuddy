/**
 * Types for useScheduler hook
 */

import type {
  StudySchedule,
  ScheduledSession,
  CustomReminder,
  NotificationPreferences,
} from '@/lib/scheduler/types';

export interface UseSchedulerOptions {
  /** Enable automatic checking for due items */
  autoCheck?: boolean;
  /** Check interval in ms (default: 60000 = 1 minute) */
  checkInterval?: number;
  /** Enable auto-fetch on mount (default: true) */
  autoFetch?: boolean;
}

export interface UseSchedulerReturn {
  /** User's study schedule */
  schedule: StudySchedule | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Fetch schedule from server */
  fetchSchedule: () => Promise<void>;
  /** Create a new scheduled session */
  createSession: (data: Omit<ScheduledSession, 'id' | 'userId'>) => Promise<ScheduledSession | null>;
  /** Update an existing session */
  updateSession: (id: string, data: Partial<ScheduledSession>) => Promise<ScheduledSession | null>;
  /** Delete a session */
  deleteSession: (id: string) => Promise<boolean>;
  /** Create a custom reminder */
  createReminder: (data: Omit<CustomReminder, 'id' | 'userId' | 'createdAt'>) => Promise<CustomReminder | null>;
  /** Update a reminder */
  updateReminder: (id: string, data: Partial<CustomReminder>) => Promise<CustomReminder | null>;
  /** Delete a reminder */
  deleteReminder: (id: string) => Promise<boolean>;
  /** Update notification preferences */
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<boolean>;
  /** Check for due items and create notifications */
  checkForDueItems: () => Promise<{ notificationsCreated: number; types: string[] }>;
}
