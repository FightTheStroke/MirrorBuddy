/**
 * Types for Telemetry Store
 */

import type {
  TelemetryEvent,
  TelemetryCategory,
  TelemetryConfig,
  UsageStats,
} from '../types';

export interface TelemetryState {
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
  flushEvents: () => Promise<void>;
  startSession: () => void;
  endSession: () => void;
  updateLocalStats: (stats: Partial<TelemetryState['localStats']>) => void;
  fetchUsageStats: () => Promise<void>;
  resetLocalStats: () => void;
}
