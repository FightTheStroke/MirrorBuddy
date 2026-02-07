// ============================================================================
// TELEMETRY STORE ACTION HANDLERS
// Business logic extracted from store methods
// ============================================================================

import { nanoid } from "nanoid";
import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth";
import type {
  TelemetryEvent,
  TelemetryConfig,
  TelemetryCategory,
} from "../types";
import type { TelemetryState } from "./types";
import { isSameDay } from "./utils";

/**
 * Handle track event logic - validates, updates queue and local stats
 */
export function handleTrackEvent(
  state: TelemetryState,
  category: TelemetryCategory,
  action: string,
  label: string | undefined,
  value: number | undefined,
  metadata: Record<string, string | number | boolean> | undefined,
): { eventQueue: TelemetryEvent[]; localStats: TelemetryState["localStats"] } {
  // Check if telemetry is enabled
  if (!state.config.enabled) {
    return { eventQueue: state.eventQueue, localStats: state.localStats };
  }

  // Check if category is excluded
  if (state.config.excludeCategories.includes(category)) {
    return { eventQueue: state.eventQueue, localStats: state.localStats };
  }

  // Apply sample rate
  if (Math.random() > state.config.sampleRate) {
    return { eventQueue: state.eventQueue, localStats: state.localStats };
  }

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

  // Add to queue and trim if needed
  const newQueue = [...state.eventQueue, event];
  const trimmedQueue =
    newQueue.length > state.config.maxQueueSize
      ? newQueue.slice(-state.config.maxQueueSize)
      : newQueue;

  // Update local stats
  const today = new Date();
  const localStats = { ...state.localStats };

  if (!isSameDay(localStats.lastActivityAt, today)) {
    localStats.todaySessions = 0;
    localStats.todayStudyMinutes = 0;
    localStats.todayPageViews = 0;
    localStats.todayQuestions = 0;
  }

  localStats.lastActivityAt = today;

  // Track specific actions
  if (category === "navigation" && action === "page_view") {
    localStats.todayPageViews++;
  }
  if (category === "conversation" && action === "question_asked") {
    localStats.todayQuestions++;
  }
  if (category === "conversation" && action === "session_ended" && value) {
    localStats.todayStudyMinutes += Math.round(value / 60);
  }

  return { eventQueue: trimmedQueue, localStats };
}

/**
 * Handle session start logic
 */
export function handleStartSession(state: TelemetryState): {
  sessionStartedAt: Date;
  localStats: TelemetryState["localStats"];
} {
  const today = new Date();
  let localStats = { ...state.localStats };

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

  return {
    sessionStartedAt: new Date(),
    localStats,
  };
}

/**
 * Handle session end logic - returns duration in seconds
 */
export function handleEndSession(sessionStartedAt: Date | null): number {
  if (sessionStartedAt) {
    return Math.round((Date.now() - sessionStartedAt.getTime()) / 1000);
  }
  return 0;
}

/**
 * Handle flush events API call
 */
export async function handleFlushEvents(
  eventQueue: TelemetryEvent[],
  _config: TelemetryConfig,
): Promise<void> {
  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];

  try {
    await csrfFetch("/api/telemetry/events", {
      method: "POST",
      body: JSON.stringify({ events: eventsToSend }),
    });
  } catch (error) {
    logger.warn("Telemetry flush failed (non-critical)", { error });
    throw error;
  }
}

/**
 * Handle fetch usage stats from server
 */
export async function handleFetchUsageStats(): Promise<
  TelemetryState["usageStats"]
> {
  try {
    const response = await fetch("/api/telemetry/stats", {
      credentials: "same-origin",
      mode: "same-origin",
    });

    if (response.ok) {
      const stats = await response.json();
      return {
        ...stats,
        lastUpdated: new Date(stats.lastUpdated),
      };
    }
  } catch (error) {
    logger.error("Failed to fetch usage stats", undefined, error);
  }
  return null;
}
