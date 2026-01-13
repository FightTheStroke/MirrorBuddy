/**
 * Types for Admin Analytics page
 */

export interface TokenUsageData {
  period: { days: number; startDate: string };
  summary: {
    totalTokens: number;
    totalCalls: number;
    avgTokensPerCall: number;
    estimatedCostUsd: number;
  };
  byAction: Record<string, { count: number; totalTokens: number }>;
  dailyUsage: Record<string, number>;
}

export interface VoiceMetricsData {
  period: { days: number; startDate: string };
  voice: {
    totalSessions: number;
    totalMinutes: number;
    avgSessionMinutes: number;
  };
  tts: {
    totalGenerations: number;
    totalCharacters: number;
    avgCharactersPerGeneration: number;
  };
  realtime: {
    totalSessions: number;
    totalMinutes: number;
  };
  dailySessions: Record<string, number>;
}

export interface FsrsStatsData {
  period: { days: number; startDate: string };
  summary: {
    totalCards: number;
    totalReviews: number;
    correctReviews: number;
    accuracy: number;
    avgDifficulty: number;
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

export interface SafetyEventsData {
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
