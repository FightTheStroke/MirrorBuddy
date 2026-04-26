// ============================================================================
// TELEMETRY TYPES
// Types for usage tracking, analytics, and Grafana integration
// ============================================================================

/**
 * Telemetry event categories for grouping metrics.
 */
export type TelemetryCategory =
  | 'navigation' // Page views, tab switches
  | 'education' // Quizzes, flashcards, mind maps
  | 'conversation' // Chat messages, voice sessions
  | 'maestro' // Maestro interactions
  | 'tools' // Tool usage (calculators, diagrams)
  | 'accessibility' // A11y feature usage
  | 'error' // Errors and crashes
  | 'performance' // Performance metrics (load times, etc.)
  | 'ai' // AI token usage (chat completions, TTS)
  | 'voice' // Voice input/transcription sessions
  | 'realtime'; // WebRTC realtime voice sessions

/**
 * Individual telemetry event.
 */
export interface TelemetryEvent {
  id: string;
  timestamp: Date;
  category: TelemetryCategory;
  action: string; // e.g., "page_view", "quiz_started", "voice_session_started"
  label?: string; // Additional context (page name, maestro ID, etc.)
  value?: number; // Numeric value (duration, count, etc.)
  metadata?: Record<string, string | number | boolean>;
  sessionId: string; // Browser session ID
  userId?: string; // If authenticated
}

/**
 * Aggregated metrics for a time period.
 */
export interface AggregatedMetrics {
  period: 'hour' | 'day' | 'week' | 'month';
  startTime: Date;
  endTime: Date;
  metrics: {
    // General usage
    totalSessions: number;
    uniqueUsers: number;
    avgSessionDuration: number; // minutes

    // Feature usage counts
    pageViews: Record<string, number>;
    maestroUsage: Record<string, number>;
    featureUsage: Record<string, number>;

    // Education metrics
    quizzesStarted: number;
    quizzesCompleted: number;
    flashcardsReviewed: number;
    voiceSessionMinutes: number;

    // Errors
    errorCount: number;
    errorsByType: Record<string, number>;

    // Performance
    avgPageLoadMs: number;
    avgApiResponseMs: number;
  };
}

/**
 * Real-time dashboard data.
 */
export interface RealtimeDashboard {
  activeUsers: number;
  activeSessions: number;
  currentMaestroUsage: Record<string, number>;
  last5MinEvents: number;
  systemHealth: 'healthy' | 'degraded' | 'down';
}

/**
 * Prometheus-compatible metric.
 */
export interface PrometheusMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  help: string;
  value: number;
  labels?: Record<string, string>;
}

/**
 * Telemetry configuration.
 */
export interface TelemetryConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of events to capture
  batchSize: number; // Events per batch before sending
  flushIntervalMs: number; // Auto-flush interval
  maxQueueSize: number; // Max events in memory queue
  excludeCategories: TelemetryCategory[];
}

/**
 * Time series data point for charts.
 */
export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

/**
 * Chart data for dashboard visualization.
 */
export interface ChartData {
  label: string;
  color: string;
  data: TimeSeriesPoint[];
}

/**
 * Usage statistics for the settings dashboard.
 */
export interface UsageStats {
  // Today's stats
  todaySessions: number;
  todayStudyMinutes: number;
  todayQuestions: number;

  // Weekly stats
  weeklyActiveMinutes: number;
  weeklySessionsCount: number;
  weeklyMaestrosUsed: string[];

  // Historical charts (last 7 days)
  dailyActivityChart: ChartData[];
  featureUsageChart: ChartData[];
  maestroPreferencesChart: ChartData[];

  // Trends
  studyTimeTrend: 'increasing' | 'stable' | 'decreasing';
  engagementScore: number; // 0-100

  // Last updated
  lastUpdated: Date;
}
