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

/**
 * Session metrics data from REAL API responses.
 * Cost and token data are actual values, not estimates.
 */
export interface SessionMetricsData {
  period: { days: number; startDate: string };
  summary: {
    totalSessions: number;
    totalTurns: number;
    avgTurnsPerSession: number;
    avgLatencyMs: number;
  };
  tokens: {
    totalIn: number;
    totalOut: number;
    total: number;
  };
  cost: {
    totalEur: number;
    avgPerSession: number;
    p95PerSession: number;
    voiceMinutes: number;
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
    totalRefusals: number;
    correctRefusals: number;
    refusalAccuracy: number;
    jailbreakAttempts: number;
    stuckLoops: number;
    severityDistribution: Record<string, number>;
  };
  outcomes: Record<string, number>;
  dailyBreakdown: Record<
    string,
    { sessions: number; cost: number; tokens: number }
  >;
}

/**
 * External services API usage metrics.
 * Monitors Azure OpenAI, Google Drive, Brave Search quotas.
 */
export interface ExternalServicesData {
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
