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
  TelemetryCategory,
  TelemetryConfig,
  UsageStats,
} from './types';

// ============================================================================
// STORE STATE
// ============================================================================

interface TelemetryState {
  // Configuration
  config: TelemetryConfig;

  // Session management
  sessionId: string;
  sessionStartedAt: Date | null;

  // Event queue (batched before sending)
  eventQueue: TelemetryEvent[];

  // Local stats (updated in real-time)
  localStats: {
    todaySessions: number;
    todayStudyMinutes: number;
    todayPageViews: number;
    todayQuestions: number;
    lastActivityAt: Date | null;
  };

  // Cached usage stats from server
  usageStats: UsageStats | null;
  lastFetchedAt: Date | null;

  // Actions
  trackEvent: (
    category: TelemetryCategory,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, string | number | boolean>
  ) => void;

  startSession: () => void;
  endSession: () => void;

  flushEvents: () => Promise<void>;

  updateConfig: (config: Partial<TelemetryConfig>) => void;

  fetchUsageStats: () => Promise<void>;

  clearLocalData: () => void;
}

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
// HELPERS
// ============================================================================

function generateSessionId(): string {
  // Use nanoid for cryptographically secure random strings
  return `sess_${Date.now()}_${nanoid(7)}`;
}

function isSameDay(date1: Date | string | null, date2: Date): boolean {
  if (!date1) return false;
  // Handle string dates from JSON serialization
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  if (isNaN(d1.getTime())) return false;
  return (
    d1.getFullYear() === date2.getFullYear() &&
    d1.getMonth() === date2.getMonth() &&
    d1.getDate() === date2.getDate()
  );
}

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
          const response = await fetch('/api/telemetry/stats');

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

// ============================================================================
// HOOKS & UTILITIES
// ============================================================================

/**
 * Track a page view event.
 */
export function trackPageView(pageName: string, metadata?: Record<string, string | number | boolean>) {
  useTelemetryStore.getState().trackEvent('navigation', 'page_view', pageName, undefined, metadata);
}

/**
 * Track a feature usage event.
 */
export function trackFeatureUsage(feature: string, action: string, value?: number) {
  useTelemetryStore.getState().trackEvent('education', action, feature, value);
}

/**
 * Track a maestro interaction.
 */
export function trackMaestroInteraction(maestroId: string, action: string, durationSeconds?: number) {
  useTelemetryStore.getState().trackEvent('maestro', action, maestroId, durationSeconds);
}

/**
 * Track an error.
 */
export function trackError(errorType: string, errorMessage: string, metadata?: Record<string, string | number | boolean>) {
  useTelemetryStore.getState().trackEvent('error', errorType, errorMessage, undefined, metadata);
}

/**
 * Track performance metric.
 */
export function trackPerformance(metricName: string, valueMs: number, metadata?: Record<string, string | number | boolean>) {
  useTelemetryStore.getState().trackEvent('performance', metricName, undefined, valueMs, metadata);
}

/**
 * Initialize telemetry on app start.
 */
export function initializeTelemetry() {
  const store = useTelemetryStore.getState();

  // Start session
  store.startSession();

  // Set up auto-flush interval
  const flushInterval = setInterval(() => {
    store.flushEvents();
  }, store.config.flushIntervalMs);

  // Flush on page unload
  const handleUnload = () => {
    const state = useTelemetryStore.getState();

    // Track session end event
    if (state.sessionStartedAt) {
      const durationSeconds = Math.round(
        (Date.now() - state.sessionStartedAt.getTime()) / 1000
      );
      state.trackEvent('navigation', 'session_ended', undefined, durationSeconds);
    }

    // Use sendBeacon for reliable delivery on unload (fetch() gets aborted)
    const events = state.eventQueue;
    if (events.length > 0) {
      navigator.sendBeacon(
        '/api/telemetry/events',
        new Blob([JSON.stringify({ events })], { type: 'application/json' })
      );
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        store.flushEvents();
      }
    });
  }

  // Return cleanup function
  return () => {
    clearInterval(flushInterval);
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleUnload);
    }
  };
}
