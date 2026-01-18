/**
 * Scheduler API Helpers
 * Server communication functions for schedule, sessions, reminders, and preferences
 */

'use client';

import type {
  StudySchedule,
  ScheduledSession,
  CustomReminder,
  NotificationPreferences,
} from '@/lib/scheduler/types';
import { csrfFetch } from '@/lib/auth/csrf-client';

/**
 * Fetch user's complete schedule
 */
export async function fetchScheduleAPI(): Promise<StudySchedule> {
  const response = await fetch('/api/scheduler');

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch schedule');
  }

  return response.json();
}

/**
 * Create a new session
 */
export async function createSessionAPI(
  data: Omit<ScheduledSession, 'id' | 'userId'>
): Promise<ScheduledSession> {
  const response = await csrfFetch('/api/scheduler', {
    method: 'POST',
    body: JSON.stringify({ type: 'session', ...data }),
  });

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) throw new Error('Failed to create session');

  return response.json();
}

/**
 * Update an existing session
 */
export async function updateSessionAPI(
  id: string,
  data: Partial<ScheduledSession>
): Promise<ScheduledSession> {
  const response = await csrfFetch('/api/scheduler', {
    method: 'PATCH',
    body: JSON.stringify({ type: 'session', id, ...data }),
  });

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) throw new Error('Failed to update session');

  return response.json();
}

/**
 * Delete a session
 */
export async function deleteSessionAPI(id: string): Promise<void> {
  const response = await csrfFetch(`/api/scheduler?type=session&id=${id}`, {
    method: 'DELETE',
  });

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) throw new Error('Failed to delete session');
}

/**
 * Create a new reminder
 */
export async function createReminderAPI(
  data: Omit<CustomReminder, 'id' | 'userId' | 'createdAt'>
): Promise<CustomReminder> {
  const response = await csrfFetch('/api/scheduler', {
    method: 'POST',
    body: JSON.stringify({ type: 'reminder', ...data }),
  });

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) throw new Error('Failed to create reminder');

  return response.json();
}

/**
 * Update an existing reminder
 */
export async function updateReminderAPI(
  id: string,
  data: Partial<CustomReminder>
): Promise<CustomReminder> {
  const response = await csrfFetch('/api/scheduler', {
    method: 'PATCH',
    body: JSON.stringify({ type: 'reminder', id, ...data }),
  });

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) throw new Error('Failed to update reminder');

  return response.json();
}

/**
 * Delete a reminder
 */
export async function deleteReminderAPI(id: string): Promise<void> {
  const response = await csrfFetch(`/api/scheduler?type=reminder&id=${id}`, {
    method: 'DELETE',
  });

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) throw new Error('Failed to delete reminder');
}

/**
 * Update notification preferences
 */
export async function updatePreferencesAPI(
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const response = await csrfFetch('/api/scheduler', {
    method: 'PATCH',
    body: JSON.stringify({ type: 'preferences', ...prefs }),
  });

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) throw new Error('Failed to update preferences');

  const { preferences } = await response.json();
  return preferences;
}

/**
 * Check for due items
 */
export async function checkDueItemsAPI(): Promise<{
  notificationsCreated: number;
  types: string[];
}> {
  const response = await csrfFetch('/api/scheduler/check-due', {
    method: 'POST',
    body: '{}',
  });

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) throw new Error('Failed to check due items');

  return response.json();
}
