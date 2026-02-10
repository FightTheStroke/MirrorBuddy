/**
 * GET /api/admin/analytics/locales
 * Locale usage analytics for admin dashboard
 *
 * Returns:
 * - Users per locale
 * - Sessions per locale
 * - Messages per locale
 * - Feature usage per locale (by tool type)
 * - Trends over time (daily breakdown)
 *
 * Query params:
 * - startDate: YYYY-MM-DD (default: 30 days ago)
 * - endDate: YYYY-MM-DD (default: today)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';
import { LocaleAnalyticsResponse } from './types';
import {
  buildUserLocaleMap,
  aggregateUserMetrics,
  aggregateSessionMetrics,
  aggregateMessageMetrics,
  aggregateToolMetrics,
  calculateTrends,
} from './helpers';

export const GET = pipe(
  withSentry('/api/admin/analytics/locales'),
  withAdmin,
)(async (ctx) => {
  // Parse query parameters
  const searchParams = ctx.req.nextUrl.searchParams;
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  const now = new Date();
  const startDate = startDateParam
    ? new Date(startDateParam)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
  const endDate = endDateParam ? new Date(endDateParam) : now;

  // Fetch user data by language/locale (from Settings)
  const usersByLocale = await prisma.settings.groupBy({
    by: ['language'],
    where: {
      user: {
        isTestData: false,
      },
    },
    _count: {
      userId: true,
    },
  });

  // Fetch conversation data to get session counts by locale
  const conversationsByLocale = await prisma.conversation.groupBy({
    by: ['userId'],
    where: {
      isTestData: false,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      id: true,
    },
  });

  // Get user IDs for conversation locales
  const userIdsFromConversations = conversationsByLocale.map((c) => c.userId);

  // Fetch settings for those users to get their locale
  const conversationUserLocales = await prisma.settings.findMany({
    where: {
      userId: {
        in: userIdsFromConversations,
      },
    },
    take: 50000,
    select: {
      language: true,
      userId: true,
    },
  });

  // Build locale map for conversations
  const localeToUsers = new Map<string, Set<string>>();
  conversationUserLocales.forEach((setting) => {
    if (!localeToUsers.has(setting.language)) {
      localeToUsers.set(setting.language, new Set());
    }
    localeToUsers.get(setting.language)!.add(setting.userId);
  });

  // Fetch messages data with conversation details
  const messages = await prisma.message.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      isTestData: false,
    },
    take: 50000,
    select: {
      id: true,
      conversationId: true,
      createdAt: true,
      conversation: {
        select: {
          userId: true,
          id: true,
        },
      },
    },
  });

  // Fetch tool outputs data
  const toolOutputs = await prisma.toolOutput.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    take: 50000,
    select: {
      id: true,
      toolType: true,
      conversationId: true,
      createdAt: true,
      conversation: {
        select: {
          userId: true,
        },
      },
    },
  });

  // Get all user settings
  const allUserSettings = await prisma.settings.findMany({
    take: 50000,
    select: {
      userId: true,
      language: true,
    },
  });

  const userLocaleMap = buildUserLocaleMap(allUserSettings);
  const localeMetricsMap = aggregateUserMetrics(usersByLocale);

  aggregateSessionMetrics(conversationsByLocale, userLocaleMap, localeMetricsMap);
  aggregateMessageMetrics(messages, userLocaleMap, localeMetricsMap);
  aggregateToolMetrics(toolOutputs, userLocaleMap, localeMetricsMap);

  const trends = calculateTrends(messages, userLocaleMap);

  // Convert to array and sort
  const byLocale = Array.from(localeMetricsMap.values()).sort((a, b) => b.userCount - a.userCount);

  // Top locales
  const topLocales = byLocale.slice(0, 10).map((metric) => ({
    locale: metric.locale,
    userCount: metric.userCount,
    messageCount: metric.messageCount,
  }));

  // Summary
  const totalUsers = Array.from(new Set(allUserSettings.map((s) => s.userId))).length;
  const totalSessions = conversationsByLocale.reduce((sum, item) => sum + item._count.id, 0);
  const totalMessages = messages.length;

  const response: LocaleAnalyticsResponse = {
    summary: {
      totalLocales: localeMetricsMap.size,
      totalUsers,
      totalSessions,
      totalMessages,
      periodStart: startDate.toISOString().split('T')[0],
      periodEnd: endDate.toISOString().split('T')[0],
    },
    byLocale,
    trends,
    topLocales,
  };

  return NextResponse.json(response);
});
