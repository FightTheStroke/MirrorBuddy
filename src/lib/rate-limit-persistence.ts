/**
 * Rate Limit Event Persistence
 * Dashboard analytics and logging for rate limit violations
 */

import { prisma } from '@/lib/db';
import type { RateLimitConfig } from './rate-limit';

/**
 * Log a rate limit violation event to the database
 * Called when rate limit is exceeded (for analytics dashboard)
 */
export async function logRateLimitEvent(
  endpoint: string,
  config: RateLimitConfig,
  options: { userId?: string; ipAddress?: string } = {}
): Promise<void> {
  try {
    await prisma.rateLimitEvent.create({
      data: {
        userId: options.userId ?? null,
        endpoint,
        limit: config.maxRequests,
        window: Math.floor(config.windowMs / 1000),
        ipAddress: options.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error('Failed to log rate limit event:', error);
  }
}

/**
 * Get rate limit events for dashboard analytics
 */
export async function getRateLimitEvents(options: {
  startDate?: Date;
  endDate?: Date;
  endpoint?: string;
  limit?: number;
} = {}): Promise<{
  events: Array<{
    id: string;
    userId: string | null;
    endpoint: string;
    limit: number;
    window: number;
    ipAddress: string | null;
    timestamp: Date;
  }>;
  total: number;
}> {
  const where = {
    ...(options.startDate || options.endDate
      ? {
          timestamp: {
            ...(options.startDate && { gte: options.startDate }),
            ...(options.endDate && { lte: options.endDate }),
          },
        }
      : {}),
    ...(options.endpoint && { endpoint: options.endpoint }),
  };

  const [events, total] = await Promise.all([
    prisma.rateLimitEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options.limit ?? 100,
    }),
    prisma.rateLimitEvent.count({ where }),
  ]);

  return { events, total };
}

/**
 * Get aggregated rate limit stats for dashboard
 */
export async function getRateLimitStats(
  startDate: Date,
  endDate: Date
): Promise<{
  totalEvents: number;
  byEndpoint: Record<string, number>;
  uniqueUsers: number;
  uniqueIps: number;
}> {
  const events = await prisma.rateLimitEvent.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      endpoint: true,
      userId: true,
      ipAddress: true,
    },
  });

  const byEndpoint: Record<string, number> = {};
  const users = new Set<string>();
  const ips = new Set<string>();

  for (const event of events) {
    byEndpoint[event.endpoint] = (byEndpoint[event.endpoint] || 0) + 1;
    if (event.userId) users.add(event.userId);
    if (event.ipAddress) ips.add(event.ipAddress);
  }

  return {
    totalEvents: events.length,
    byEndpoint,
    uniqueUsers: users.size,
    uniqueIps: ips.size,
  };
}
