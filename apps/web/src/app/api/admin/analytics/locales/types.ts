/**
 * Types for locale analytics endpoint
 */

export interface LocaleMetrics {
  locale: string;
  userCount: number;
  sessionCount: number;
  messageCount: number;
  toolUsageByType: {
    [toolType: string]: number;
  };
  averageMessagesPerSession: number;
}

export interface LocaleAnalyticsResponse {
  summary: {
    totalLocales: number;
    totalUsers: number;
    totalSessions: number;
    totalMessages: number;
    periodStart: string;
    periodEnd: string;
  };
  byLocale: LocaleMetrics[];
  trends: Array<{
    date: string;
    locale: string;
    userCount: number;
    sessionCount: number;
    messageCount: number;
  }>;
  topLocales: Array<{
    locale: string;
    userCount: number;
    messageCount: number;
  }>;
}

export interface TrendData {
  messageCount: number;
  sessionCount: number;
  userCount: number;
}
