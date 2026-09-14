// ============================================================================
// TELEMETRY STORE (Zustand)
// Client-side telemetry collection and batching
// ============================================================================

import { create } from 'zustand';
// Issue #64: Removed persist() - telemetry uses server API
import { generateSessionId } from './telemetry-store/utils';
import type { TelemetryConfig } from './types';
import type { TelemetryState } from './telemetry-store/types';
import { logger } from '@/lib/logger';
import {
  hasAnalyticsConsent,
  getAnalyticsGeneration,
  onAnalyticsRevoked,
} from './optional-analytics-client';
import {
  handleTrackEvent,
  handleStartSession,
  handleEndSession,
  handleFlushEvents,
  handleFetchUsageStats,
} from './telemetry-store/store-actions';

export type { TelemetryState } from './telemetry-store/types';

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: TelemetryConfig = {
  enabled: true,
  sampleRate: 1.0, // Capture all events
  batchSize: 10, // Send every 10 events
  flushIntervalMs: 30000, // Auto-flush every 30 seconds
  maxQueueSize: 100, // Max 100 events in queue
  excludeCategories: [],
};
let queueGeneration = 0;

// ============================================================================
// STORE
// ============================================================================

export const useTelemetryStore = create<TelemetryState>()((set, get) => ({
  // Initial state
  config: DEFAULT_CONFIG,
  sessionId: '',
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
    if (!hasAnalyticsConsent() || !get().config.enabled) {
      get().clearLocalData();
      return;
    }
    if (!get().sessionId) set({ sessionId: generateSessionId() });
    const state = get();
    const { eventQueue, localStats } = handleTrackEvent(
      state,
      category,
      action,
      label,
      value,
      metadata,
    );

    set({ eventQueue, localStats });

    // Auto-flush if batch size reached
    if (eventQueue.length >= state.config.batchSize) {
      get().flushEvents();
    }
  },

  // Start a new session
  startSession: () => {
    if (!hasAnalyticsConsent() || !get().config.enabled) return;
    const state = get();
    const { sessionStartedAt, localStats } = handleStartSession(state);

    set({
      sessionId: generateSessionId(),
      sessionStartedAt,
      localStats,
    });

    // Track session start event
    get().trackEvent('navigation', 'session_started');
  },

  // End current session
  endSession: () => {
    const state = get();
    const durationSeconds = handleEndSession(state.sessionStartedAt);

    if (durationSeconds > 0) {
      get().trackEvent('navigation', 'session_ended', undefined, durationSeconds);
    }

    // Flush remaining events
    get().flushEvents();

    set({ sessionStartedAt: null });
  },

  // Flush events to server
  flushEvents: async () => {
    const state = get();
    if (!hasAnalyticsConsent() || !state.config.enabled) {
      get().clearLocalData();
      return;
    }
    if (state.eventQueue.length === 0) return;

    const generation = getAnalyticsGeneration();
    const queuedAt = queueGeneration;
    const eventsToSend = [...state.eventQueue];
    set({ eventQueue: [] });

    try {
      await handleFlushEvents(eventsToSend, state.config);
    } catch (error) {
      logger.warn('Optional telemetry flush failed', { error: String(error) });
      if (
        hasAnalyticsConsent() &&
        get().config.enabled &&
        generation === getAnalyticsGeneration() &&
        queuedAt === queueGeneration
      ) {
        set((s) => ({
          eventQueue: [...eventsToSend, ...s.eventQueue].slice(-s.config.maxQueueSize),
        }));
      }
    }
  },

  // Update configuration
  updateConfig: (configUpdates) => {
    set((state) => ({
      config: { ...state.config, ...configUpdates },
    }));
    if (!get().config.enabled) get().clearLocalData();
  },

  // Fetch usage stats from server
  fetchUsageStats: async () => {
    if (!hasAnalyticsConsent() || !get().config.enabled) return;
    const generation = getAnalyticsGeneration();
    const queuedAt = queueGeneration;
    const usageStats = await handleFetchUsageStats();
    if (
      usageStats &&
      hasAnalyticsConsent() &&
      get().config.enabled &&
      generation === getAnalyticsGeneration() &&
      queuedAt === queueGeneration
    ) {
      set({
        usageStats,
        lastFetchedAt: new Date(),
      });
    }
  },

  // Update local stats
  updateLocalStats: (stats) => {
    if (!hasAnalyticsConsent() || !get().config.enabled) return;
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
    queueGeneration++;
    set({
      sessionId: '',
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
    });
  },
}));

onAnalyticsRevoked(() => useTelemetryStore.getState().clearLocalData());
