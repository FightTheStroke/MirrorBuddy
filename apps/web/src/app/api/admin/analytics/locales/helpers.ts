/**
 * Helper functions for locale analytics calculations
 */

import { LocaleMetrics, TrendData } from "./types";

export function buildUserLocaleMap(
  settings: Array<{ userId: string; language: string }>,
): Map<string, string> {
  const map = new Map<string, string>();
  settings.forEach((setting) => {
    map.set(setting.userId, setting.language);
  });
  return map;
}

export function aggregateUserMetrics(
  usersByLocale: Array<{
    language: string;
    _count: { userId: number };
  }>,
): Map<string, LocaleMetrics> {
  const map = new Map<string, LocaleMetrics>();

  usersByLocale.forEach((item) => {
    const locale = item.language;
    if (!map.has(locale)) {
      map.set(locale, {
        locale,
        userCount: 0,
        sessionCount: 0,
        messageCount: 0,
        toolUsageByType: {},
        averageMessagesPerSession: 0,
      });
    }
    const metrics = map.get(locale)!;
    metrics.userCount = item._count.userId;
  });

  return map;
}

export function aggregateSessionMetrics(
  conversationsByLocale: Array<{
    userId: string;
    _count: { id: number };
  }>,
  userLocaleMap: Map<string, string>,
  localeMetricsMap: Map<string, LocaleMetrics>,
): void {
  const sessionCountByLocale = new Map<string, number>();

  conversationsByLocale.forEach((item) => {
    const locale = userLocaleMap.get(item.userId) || "unknown";
    sessionCountByLocale.set(
      locale,
      (sessionCountByLocale.get(locale) || 0) + item._count.id,
    );
  });

  sessionCountByLocale.forEach((count, locale) => {
    if (!localeMetricsMap.has(locale)) {
      localeMetricsMap.set(locale, {
        locale,
        userCount: 0,
        sessionCount: 0,
        messageCount: 0,
        toolUsageByType: {},
        averageMessagesPerSession: 0,
      });
    }
    const metrics = localeMetricsMap.get(locale)!;
    metrics.sessionCount = count;
  });
}

export function aggregateMessageMetrics(
  messages: Array<{
    id: string;
    conversationId: string;
    createdAt: Date;
    conversation: { userId: string; id: string };
  }>,
  userLocaleMap: Map<string, string>,
  localeMetricsMap: Map<string, LocaleMetrics>,
): void {
  const messageCountByLocale = new Map<string, number>();

  messages.forEach((msg) => {
    const locale = userLocaleMap.get(msg.conversation.userId) || "unknown";
    messageCountByLocale.set(
      locale,
      (messageCountByLocale.get(locale) || 0) + 1,
    );
  });

  messageCountByLocale.forEach((count, locale) => {
    if (!localeMetricsMap.has(locale)) {
      localeMetricsMap.set(locale, {
        locale,
        userCount: 0,
        sessionCount: 0,
        messageCount: 0,
        toolUsageByType: {},
        averageMessagesPerSession: 0,
      });
    }
    const metrics = localeMetricsMap.get(locale)!;
    metrics.messageCount = count;
    if (metrics.sessionCount > 0) {
      metrics.averageMessagesPerSession =
        Math.round((metrics.messageCount / metrics.sessionCount) * 100) / 100;
    }
  });
}

export function aggregateToolMetrics(
  toolOutputs: Array<{
    id: string;
    toolType: string;
    conversationId: string;
    createdAt: Date;
    conversation: { userId: string };
  }>,
  userLocaleMap: Map<string, string>,
  localeMetricsMap: Map<string, LocaleMetrics>,
): void {
  toolOutputs.forEach((tool) => {
    const locale = userLocaleMap.get(tool.conversation.userId) || "unknown";
    if (!localeMetricsMap.has(locale)) {
      localeMetricsMap.set(locale, {
        locale,
        userCount: 0,
        sessionCount: 0,
        messageCount: 0,
        toolUsageByType: {},
        averageMessagesPerSession: 0,
      });
    }
    const metrics = localeMetricsMap.get(locale)!;
    const toolType = tool.toolType || "unknown";
    metrics.toolUsageByType[toolType] =
      (metrics.toolUsageByType[toolType] || 0) + 1;
  });
}

export function calculateTrends(
  messages: Array<{
    id: string;
    conversationId: string;
    createdAt: Date;
    conversation: { userId: string; id: string };
  }>,
  userLocaleMap: Map<string, string>,
): Array<{
  date: string;
  locale: string;
  userCount: number;
  sessionCount: number;
  messageCount: number;
}> {
  const trendsMap = new Map<string, Map<string, TrendData>>();

  messages.forEach((msg) => {
    const locale = userLocaleMap.get(msg.conversation.userId) || "unknown";
    const date = msg.createdAt.toISOString().split("T")[0];

    if (!trendsMap.has(date)) {
      trendsMap.set(date, new Map());
    }
    if (!trendsMap.get(date)!.has(locale)) {
      trendsMap.get(date)!.set(locale, {
        messageCount: 0,
        sessionCount: 0,
        userCount: 0,
      });
    }

    const trend = trendsMap.get(date)!.get(locale)!;
    trend.messageCount += 1;
  });

  const trends: Array<{
    date: string;
    locale: string;
    userCount: number;
    sessionCount: number;
    messageCount: number;
  }> = [];

  trendsMap.forEach((localeMap, date) => {
    localeMap.forEach((counts, locale) => {
      trends.push({
        date,
        locale,
        userCount: 0,
        sessionCount: 0,
        messageCount: counts.messageCount,
      });
    });
  });

  trends.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return trends;
}
