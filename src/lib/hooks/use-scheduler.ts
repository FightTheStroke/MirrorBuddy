/**
 * useScheduler Hook
 * Manages study schedule, sessions, reminders, and periodic checking for due items
 *
 * Related: Issue #27
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  StudySchedule,
  ScheduledSession,
  CustomReminder,
  NotificationPreferences,
} from '@/lib/scheduler/types';
import { DEFAULT_SCHEDULER_CONFIG } from '@/lib/scheduler/types';
import type { UseSchedulerOptions, UseSchedulerReturn } from './use-scheduler/types';
import {
  fetchScheduleAPI,
  createSessionAPI,
  updateSessionAPI,
  deleteSessionAPI,
  createReminderAPI,
  updateReminderAPI,
  deleteReminderAPI,
  updatePreferencesAPI,
  checkDueItemsAPI,
} from './use-scheduler/scheduler-api';
import {
  setupPeriodicChecking,
  addSessionToSchedule,
  updateSessionInSchedule,
  removeSessionFromSchedule,
  addReminderToSchedule,
  updateReminderInSchedule,
  removeReminderFromSchedule,
  updatePreferencesInSchedule,
} from './use-scheduler/scheduler-effects';

export function useScheduler(options: UseSchedulerOptions = {}): UseSchedulerReturn {
  const {
    autoCheck = true,
    checkInterval = DEFAULT_SCHEDULER_CONFIG.checkInterval,
    autoFetch = true,
  } = options;

  const [schedule, setSchedule] = useState<StudySchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch schedule from server (userId is read from cookies on server)
  const fetchSchedule = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchScheduleAPI();
      setSchedule(data);
      setIsAuthenticated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch schedule';
      if (message === 'UNAUTHORIZED') {
        setIsAuthenticated(false);
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new session
  const createSession = useCallback(
    async (data: Omit<ScheduledSession, 'id' | 'userId'>): Promise<ScheduledSession | null> => {
      try {
        const session = await createSessionAPI(data);
        setSchedule((prev) => addSessionToSchedule(prev, session));
        return session;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create session';
        if (message === 'UNAUTHORIZED') {
          setIsAuthenticated(false);
        } else {
          setError(message);
        }
        return null;
      }
    },
    []
  );

  // Update a session
  const updateSession = useCallback(
    async (id: string, data: Partial<ScheduledSession>): Promise<ScheduledSession | null> => {
      try {
        const session = await updateSessionAPI(id, data);
        setSchedule((prev) => updateSessionInSchedule(prev, id, session));
        return session;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update session';
        if (message === 'UNAUTHORIZED') {
          setIsAuthenticated(false);
        } else {
          setError(message);
        }
        return null;
      }
    },
    []
  );

  // Delete a session
  const deleteSession = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await deleteSessionAPI(id);
        setSchedule((prev) => removeSessionFromSchedule(prev, id));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete session';
        if (message === 'UNAUTHORIZED') {
          setIsAuthenticated(false);
        } else {
          setError(message);
        }
        return false;
      }
    },
    []
  );

  // Create a reminder
  const createReminder = useCallback(
    async (data: Omit<CustomReminder, 'id' | 'userId' | 'createdAt'>): Promise<CustomReminder | null> => {
      try {
        const reminder = await createReminderAPI(data);
        setSchedule((prev) => addReminderToSchedule(prev, reminder));
        return reminder;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create reminder';
        if (message === 'UNAUTHORIZED') {
          setIsAuthenticated(false);
        } else {
          setError(message);
        }
        return null;
      }
    },
    []
  );

  // Update a reminder
  const updateReminder = useCallback(
    async (id: string, data: Partial<CustomReminder>): Promise<CustomReminder | null> => {
      try {
        const reminder = await updateReminderAPI(id, data);
        setSchedule((prev) => updateReminderInSchedule(prev, id, reminder));
        return reminder;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update reminder';
        if (message === 'UNAUTHORIZED') {
          setIsAuthenticated(false);
        } else {
          setError(message);
        }
        return null;
      }
    },
    []
  );

  // Delete a reminder
  const deleteReminder = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await deleteReminderAPI(id);
        setSchedule((prev) => removeReminderFromSchedule(prev, id));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete reminder';
        if (message === 'UNAUTHORIZED') {
          setIsAuthenticated(false);
        } else {
          setError(message);
        }
        return false;
      }
    },
    []
  );

  // Update preferences
  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>): Promise<boolean> => {
      try {
        const preferences = await updatePreferencesAPI(prefs);
        setSchedule((prev) => updatePreferencesInSchedule(prev, preferences));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update preferences';
        if (message === 'UNAUTHORIZED') {
          setIsAuthenticated(false);
        } else {
          setError(message);
        }
        return false;
      }
    },
    []
  );

  // Check for due items
  const checkDue = useCallback(async () => {
    try {
      return await checkDueItemsAPI();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check due items';
      if (message === 'UNAUTHORIZED') {
        setIsAuthenticated(false);
      }
      return { notificationsCreated: 0, types: [] };
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchSchedule();
    }
  }, [autoFetch, fetchSchedule]);

  // Setup periodic checking
  useEffect(() => {
    if (!autoCheck || !isAuthenticated) return;

    // Initial check
    checkDue();

    // Setup interval with helper
    const cleanup = setupPeriodicChecking(checkDue, checkInterval);
    checkIntervalRef.current = setInterval(checkDue, checkInterval);

    return cleanup;
  }, [autoCheck, isAuthenticated, checkInterval, checkDue]);

  return {
    schedule,
    isLoading,
    error,
    isAuthenticated,
    fetchSchedule,
    createSession,
    updateSession,
    deleteSession,
    createReminder,
    updateReminder,
    deleteReminder,
    updatePreferences,
    checkForDueItems: checkDue,
  };
}
