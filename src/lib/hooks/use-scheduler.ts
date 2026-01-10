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
      const response = await fetch('/api/scheduler');

      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch schedule');
      }

      const data = await response.json();
      setSchedule(data);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schedule');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new session
  const createSession = useCallback(
    async (data: Omit<ScheduledSession, 'id' | 'userId'>): Promise<ScheduledSession | null> => {
      try {
        const response = await fetch('/api/scheduler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'session', ...data }),
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          return null;
        }

        if (!response.ok) throw new Error('Failed to create session');

        const session = await response.json();

        // Update local state
        setSchedule((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            weeklyPlan: [...prev.weeklyPlan, session],
          };
        });

        return session;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create session');
        return null;
      }
    },
    []
  );

  // Update a session
  const updateSession = useCallback(
    async (id: string, data: Partial<ScheduledSession>): Promise<ScheduledSession | null> => {
      try {
        const response = await fetch('/api/scheduler', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'session', id, ...data }),
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          return null;
        }

        if (!response.ok) throw new Error('Failed to update session');

        const session = await response.json();

        // Update local state
        setSchedule((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            weeklyPlan: prev.weeklyPlan.map((s) => (s.id === id ? session : s)),
          };
        });

        return session;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update session');
        return null;
      }
    },
    []
  );

  // Delete a session
  const deleteSession = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/scheduler?type=session&id=${id}`, {
          method: 'DELETE',
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          return false;
        }

        if (!response.ok) throw new Error('Failed to delete session');

        // Update local state
        setSchedule((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            weeklyPlan: prev.weeklyPlan.filter((s) => s.id !== id),
          };
        });

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete session');
        return false;
      }
    },
    []
  );

  // Create a reminder
  const createReminder = useCallback(
    async (data: Omit<CustomReminder, 'id' | 'userId' | 'createdAt'>): Promise<CustomReminder | null> => {
      try {
        const response = await fetch('/api/scheduler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'reminder', ...data }),
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          return null;
        }

        if (!response.ok) throw new Error('Failed to create reminder');

        const reminder = await response.json();

        // Update local state
        setSchedule((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            customReminders: [...prev.customReminders, reminder],
          };
        });

        return reminder;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create reminder');
        return null;
      }
    },
    []
  );

  // Update a reminder
  const updateReminder = useCallback(
    async (id: string, data: Partial<CustomReminder>): Promise<CustomReminder | null> => {
      try {
        const response = await fetch('/api/scheduler', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'reminder', id, ...data }),
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          return null;
        }

        if (!response.ok) throw new Error('Failed to update reminder');

        const reminder = await response.json();

        // Update local state
        setSchedule((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            customReminders: prev.customReminders.map((r) => (r.id === id ? reminder : r)),
          };
        });

        return reminder;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update reminder');
        return null;
      }
    },
    []
  );

  // Delete a reminder
  const deleteReminder = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/scheduler?type=reminder&id=${id}`, {
          method: 'DELETE',
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          return false;
        }

        if (!response.ok) throw new Error('Failed to delete reminder');

        // Update local state
        setSchedule((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            customReminders: prev.customReminders.filter((r) => r.id !== id),
          };
        });

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete reminder');
        return false;
      }
    },
    []
  );

  // Update preferences
  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>) => {
      try {
        const response = await fetch('/api/scheduler', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'preferences', ...prefs }),
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          return;
        }

        if (!response.ok) throw new Error('Failed to update preferences');

        const { preferences } = await response.json();

        // Update local state
        setSchedule((prev) => {
          if (!prev) return prev;
          return { ...prev, preferences };
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update preferences');
      }
    },
    []
  );

  // Check for due items
  const checkDue = useCallback(async () => {
    try {
      const response = await fetch('/api/scheduler/check-due', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        return { notificationsCreated: 0, types: [] };
      }

      if (!response.ok) throw new Error('Failed to check due items');

      return await response.json();
    } catch {
      return { notificationsCreated: 0, types: [] };
    }
  }, []);

  // Get sessions for a specific day
  const getSessionsForDay = useCallback(
    (dayOfWeek: number): ScheduledSession[] => {
      if (!schedule) return [];
      return schedule.weeklyPlan.filter((s) => s.dayOfWeek === dayOfWeek);
    },
    [schedule]
  );

  // Get today's sessions
  const getTodaySessions = useCallback((): ScheduledSession[] => {
    return getSessionsForDay(new Date().getDay());
  }, [getSessionsForDay]);

  // Get upcoming reminders
  const getUpcomingReminders = useCallback(
    (hours = 24): CustomReminder[] => {
      if (!schedule) return [];

      const now = new Date();
      const cutoff = new Date(now.getTime() + hours * 60 * 60 * 1000);

      return schedule.customReminders.filter((r) => {
        const dt = new Date(r.datetime);
        return dt >= now && dt <= cutoff;
      });
    },
    [schedule]
  );

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

    // Setup interval
    checkIntervalRef.current = setInterval(checkDue, checkInterval);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
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
    checkDue,
    getSessionsForDay,
    getTodaySessions,
    getUpcomingReminders,
  };
}
