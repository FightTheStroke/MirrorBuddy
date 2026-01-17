// ============================================================================
// TELEMETRY STORE (Zustand)
// Client-side telemetry collection and batching
// ============================================================================

import { create } from 'zustand';
// Issue #64: Removed persist() - telemetry uses server API
import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';
import type {
  TelemetryEvent,
  TelemetryConfig,
} from './types';
import type { TelemetryState } from './telemetry-store/types';
import { generateSessionId, isSameDay } from './telemetry-store/utils';

export type { TelemetryState } from './telemetry-store/types';

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: TelemetryConfig = {
  enabled: true,
  sampleRate: 1.0,        // Capture all events
  batchSize: 10,          // Send every 10 events
  flushIntervalMs: 30000, // Auto-flush every 30 seconds
  maxQueueSize: 100,      // Max 100 events in queue
  excludeCategories: [],
};

// ============================================================================
// STORE
// ============================================================================

export const useTelemetryStore = create<TelemetryState>()(
    (set, get) => ({
      // Initial state
      config: DEFAULT_CONFIG,
      sessionId: generateSessionId(),
      sessionStartedAt: null,
      eventQueue: [],
      localStats: {
        todaySessions: 0,
        todayStudyMinutes: 0,
        todayPageViews: 0,
        todayQuestions: 0,
        lastActivityAt: null,
      },
      usageStats: null,
      lastFetchedAt: null,

      // Track an event
      trackEvent: (category, action, label, value, metadata) => {
        const state = get();

        // Check if telemetry is enabled
        if (!state.config.enabled) return;

        // Check if category is excluded
        if (state.config.excludeCategories.includes(category)) return;

        // Apply sample rate
        if (Math.random() > state.config.sampleRate) return;

        const event: TelemetryEvent = {
          id: `evt_${Date.now()}_${nanoid(7)}`,
          timestamp: new Date(),
          category,
          action,
          label,
          value,
          metadata,
          sessionId: state.sessionId,
        };

        // Add to queue
        const newQueue = [...state.eventQueue, event];

        // Trim if exceeds max size
        const trimmedQueue = newQueue.length > state.config.maxQueueSize
          ? newQueue.slice(-state.config.maxQueueSize)
          : newQueue;

        // Update local stats
        const today = new Date();
        const localStats = { ...state.localStats };

        if (!isSameDay(localStats.lastActivityAt, today)) {
          // Reset daily stats
          localStats.todaySessions = 0;
          localStats.todayStudyMinutes = 0;
          localStats.todayPageViews = 0;
          localStats.todayQuestions = 0;
        }

        localStats.lastActivityAt = today;

        // Track specific actions
        if (category === 'navigation' && action === 'page_view') {
          localStats.todayPageViews++;
        }
        if (category === 'conversation' && action === 'question_asked') {
          localStats.todayQuestions++;
        }
        if (category === 'conversation' && action === 'session_ended' && value) {
          localStats.todayStudyMinutes += Math.round(value / 60); // value in seconds
        }

        set({
          eventQueue: trimmedQueue,
          localStats,
        });

        // Auto-flush if batch size reached
        if (trimmedQueue.length >= state.config.batchSize) {
          get().flushEvents();
        }
      },

      // Start a new session
      startSession: () => {
        const state = get();
        const today = new Date();

        let localStats = { ...state.localStats };

        // Reset daily stats if new day
        if (!isSameDay(localStats.lastActivityAt, today)) {
          localStats = {
            todaySessions: 1,
            todayStudyMinutes: 0,
            todayPageViews: 0,
            todayQuestions: 0,
            lastActivityAt: today,
          };
        } else {
          localStats.todaySessions++;
          localStats.lastActivityAt = today;
        }

        set({
          sessionId: generateSessionId(),
          sessionStartedAt: new Date(),
          localStats,
        });

        // Track session start event
        get().trackEvent('navigation', 'session_started');
      },

      // End current session
      endSession: () => {
        const state = get();

        if (state.sessionStartedAt) {
          const durationSeconds = Math.round(
            (Date.now() - state.sessionStartedAt.getTime()) / 1000
          );

          get().trackEvent('navigation', 'session_ended', undefined, durationSeconds);
        }

        // Flush remaining events
        get().flushEvents();

        set({
          sessionStartedAt: null,
        });
      },

      // Flush events to server
      flushEvents: async () => {
        const state = get();

        if (state.eventQueue.length === 0) return;

        const eventsToSend = [...state.eventQueue];

        // Clear queue immediately (optimistic)
        set({ eventQueue: [] });

        try {
          await fetch('/api/telemetry/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: eventsToSend }),
            credentials: 'same-origin',
            mode: 'same-origin',
          });
        } catch (error) {
          // On failure, add events back to queue
          set((s) => ({
            eventQueue: [...eventsToSend, ...s.eventQueue].slice(-s.config.maxQueueSize),
          }));
          // Telemetry failure is not critical - log at warn level
          logger.warn('Telemetry flush failed (non-critical)', { error });
        }
      },

      // Update configuration
      updateConfig: (configUpdates) => {
        set((state) => ({
          config: { ...state.config, ...configUpdates },
        }));
      },

      // Fetch usage stats from server
      fetchUsageStats: async () => {
        try {
          const response = await fetch('/api/telemetry/stats', {
            credentials: 'same-origin',
            mode: 'same-origin',
          });

          if (response.ok) {
            const stats = await response.json();

            set({
              usageStats: {
                ...stats,
                lastUpdated: new Date(stats.lastUpdated),
              },
              lastFetchedAt: new Date(),
            });
          }
        } catch (error) {
          logger.error('Failed to fetch usage stats', { error });
        }
      },

      // Update local stats
      updateLocalStats: (stats) => {
        set((state) => ({
          localStats: {
            ...state.localStats,
            ...stats,
          },
        }));
      },

      // Reset local stats
      resetLocalStats: () => {
        set({
          localStats: {
            todaySessions: 0,
            todayStudyMinutes: 0,
            todayPageViews: 0,
            todayQuestions: 0,
            lastActivityAt: null,
          },
        });
      },

      // Clear local telemetry data
      clearLocalData: () => {
        set({
          eventQueue: [],
          localStats: {
            todaySessions: 0,
            todayStudyMinutes: 0,
            todayPageViews: 0,
            todayQuestions: 0,
            lastActivityAt: null,
          },
          usageStats: null,
          lastFetchedAt: null,
        });
      },
    })
);
