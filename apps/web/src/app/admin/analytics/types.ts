/**
 * Types for Admin Analytics page
 */

import type { AnalyticsMetricPayload } from '@/lib/admin/analytics-metric-truth';
import type { MetricTruth } from '@/lib/admin/metric-truth';

export interface TokenUsageData extends AnalyticsMetricPayload {
  period: { days: number; startDate: string };
  summary: {
    totalTokens: number | null;
    totalCalls: number;
    avgTokensPerCall: number | null;
    totalCostEur: number | null;
  };
  byAction?: Record<string, { count: number; totalTokens: number }>;
  dailyUsage: Record<string, number>;
  dailyCost: Record<string, number | null>;
}

export interface VoiceMetricsData extends AnalyticsMetricPayload {
  period: { days: number; startDate: string };
  voice: {
    totalSessions: number;
    totalMinutes: number;
    avgSessionMinutes: number | null;
  };
  tts?: {
    totalGenerations: number;
    totalCharacters: number;
    avgCharactersPerGeneration: number;
  };
  realtime?: {
    totalSessions: number;
    totalMinutes: number;
  };
  dailySessions: Record<string, number>;
}

export interface FsrsStatsData extends AnalyticsMetricPayload {
  period: { days: number; startDate: string };
  summary: {
    totalCards: number;
    totalReviews: number;
    correctReviews: number;
    accuracy: number | null;
    avgDifficulty: number | null;
    cardsDueToday: number;
  };
  stateDistribution: Record<string, number>;
  dailyReviews: Record<string, number>;
}

export interface RateLimitsData {
  period: { days: number; startDate: string };
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    uniqueIps: number;
  };
  byEndpoint: Record<string, number>;
  dailyEvents: Record<string, number>;
  recentEvents: Array<{
    id: string;
    endpoint: string;
    limit: number;
    window: number;
    timestamp: string;
  }>;
}

export interface SafetyEventsData extends AnalyticsMetricPayload {
  period: { days: number; startDate: string };
  summary: {
    totalEvents: number;
    unresolvedCount: number;
    criticalCount: number;
  };
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  dailyEvents: Record<string, number>;
  recentEvents: Array<{
    id: string;
    type: string;
    severity: string;
    timestamp: string;
    resolved: boolean;
  }>;
}

/**
 * Recorded optional session telemetry; costs are pricing-based estimates.
 */
export interface SessionMetricsData extends AnalyticsMetricPayload {
  period: { days: number; startDate: string };
  summary: {
    totalSessions: number;
    totalTurns: number | null;
    avgTurnsPerSession: number | null;
    avgLatencyMs: number | null;
  };
  tokens: {
    totalIn: number | null;
    totalOut: number | null;
    total: number | null;
  };
  cost: {
    totalEur: number | null;
    avgPerSession: number | null;
    p95PerSession: number | null;
    voiceMinutes: number | null;
    voiceCostEur?: number | null;
    thresholds: {
      textWarn: number;
      textLimit: number;
      voiceWarn: number;
      voiceLimit: number;
    };
    pricing: {
      textPer1kTokens: number;
      voicePerMin: number;
    };
  };
  safety: {
    totalRefusals: number | null;
    correctRefusals: number | null;
    refusalAccuracy: number | null;
    jailbreakAttempts: number | null;
    stuckLoops: number | null;
    severityDistribution: Record<string, number>;
  };
  outcomes: Record<string, number>;
  dailyBreakdown: Record<string, { sessions: number; cost: number | null; tokens: number }>;
}

/**
 * External services API usage metrics.
 * Monitors Azure OpenAI, Google Drive, Brave Search quotas.
 */
export interface ExternalServicesData extends AnalyticsMetricPayload {
  summary: {
    totalServices: number;
    hasAlerts: boolean;
    criticalCount: number;
    warningCount: number;
    alertDetails: Array<{
      service: string;
      metric: string;
      usagePercent: number;
      status: string;
    }>;
  };
  byService: Record<
    string,
    Array<{
      metric: string;
      current: number;
      limit: number;
      usagePercent: number;
      status: string;
      period: string;
      truth?: MetricTruth;
    }>
  >;
  quotas: {
    azureOpenAI: {
      chatTpm: number;
      chatRpm: number;
      embeddingTpm: number;
      ttsRpm: number;
      warnThreshold: number;
    };
    googleDrive: {
      queriesPerMin: number;
      dailyQueries: number;
      warnThreshold: number;
    };
    braveSearch: {
      monthlyQueries: number;
      warnThreshold: number;
    };
  };
}
