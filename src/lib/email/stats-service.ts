/**
 * Email Campaign Statistics Service
 *
 * Provides analytics for email campaigns including delivery rates, open rates,
 * bounce rates, and timeline data for dashboard widgets and reports.
 *
 * Features:
 * - getCampaignStats: Individual campaign statistics with rates
 * - getGlobalStats: Aggregate statistics across all campaigns
 * - getRecentCampaignStats: Dashboard widget data with top N campaigns
 * - getOpenTimeline: Hourly open counts for charts
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

/**
 * Campaign statistics with calculated rates
 */
export interface CampaignStats {
  campaignId: string;
  campaignName?: string;
  sent: number;
  delivered: number;
  opened: number;
  bounced: number;
  failed: number;
  openRate: number;
  deliveryRate: number;
  bounceRate: number;
}

/**
 * Global statistics across all campaigns
 */
export interface GlobalStats {
  totalCampaigns: number;
  sent: number;
  delivered: number;
  opened: number;
  bounced: number;
  failed: number;
  openRate: number;
  deliveryRate: number;
  bounceRate: number;
}

/**
 * Timeline data point for open events
 */
export interface TimelineDataPoint {
  hour: string;
  count: number;
}

/**
 * Date range filter for global stats
 */
export interface DateRangeFilter {
  from: Date;
  to: Date;
}

/**
 * Get statistics for a single campaign
 *
 * Calculates:
 * - sent: all recipients not in PENDING status
 * - delivered: DELIVERED or OPENED status
 * - opened: OPENED status
 * - bounced: BOUNCED status
 * - failed: FAILED status
 * - openRate: (opened / sent) * 100
 * - deliveryRate: (delivered / sent) * 100
 * - bounceRate: (bounced / sent) * 100
 *
 * @param campaignId - Campaign ID
 * @returns CampaignStats with all rates as percentages (0-100)
 */
export async function getCampaignStats(
  campaignId: string,
): Promise<CampaignStats> {
  try {
    // Get campaign name
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      select: { name: true },
    });

    // Get recipient status counts using groupBy
    const statusCounts = await prisma.emailRecipient.groupBy({
      by: ["status"],
      where: {
        campaignId,
      },
      _count: {
        id: true,
      },
    });

    // Initialize counters
    let sent = 0;
    let delivered = 0;
    let opened = 0;
    let bounced = 0;
    let failed = 0;

    // Process status counts
    for (const group of statusCounts) {
      const count = group._count.id;

      switch (group.status) {
        case "SENT":
          sent += count;
          break;
        case "DELIVERED":
          sent += count;
          delivered += count;
          break;
        case "OPENED":
          sent += count;
          delivered += count;
          opened += count;
          break;
        case "BOUNCED":
          sent += count;
          bounced += count;
          break;
        case "FAILED":
          sent += count;
          failed += count;
          break;
        case "PENDING":
          // Not counted as sent
          break;
      }
    }

    // Calculate rates (as percentages 0-100)
    const openRate = sent > 0 ? (opened / sent) * 100 : 0;
    const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0;
    const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;

    return {
      campaignId,
      campaignName: campaign?.name,
      sent,
      delivered,
      opened,
      bounced,
      failed,
      openRate,
      deliveryRate,
      bounceRate,
    };
  } catch (error) {
    logger.error("Error getting campaign stats", {
      campaignId,
      error: String(error),
    });
    throw error;
  }
}

/**
 * Get global statistics across all campaigns
 * Optionally filter by date range
 *
 * @param dateRange - Optional date range filter (filters by campaign createdAt)
 * @returns GlobalStats with aggregate statistics
 */
export async function getGlobalStats(
  dateRange?: DateRangeFilter,
): Promise<GlobalStats> {
  try {
    // Build campaign filter
    const campaignWhere: Prisma.EmailCampaignWhereInput = {};
    if (dateRange) {
      campaignWhere.createdAt = {
        gte: dateRange.from,
        lte: dateRange.to,
      };
    }

    // Get all campaigns in date range
    const campaigns = await prisma.emailCampaign.findMany({
      where: campaignWhere,
      select: { id: true },
    });

    const campaignIds = campaigns.map((c) => c.id);
    const totalCampaigns = campaignIds.length;

    // If no campaigns, return zero stats
    if (totalCampaigns === 0) {
      return {
        totalCampaigns: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        bounced: 0,
        failed: 0,
        openRate: 0,
        deliveryRate: 0,
        bounceRate: 0,
      };
    }

    // Get recipient status counts across all campaigns
    const statusCounts = await prisma.emailRecipient.groupBy({
      by: ["status"],
      where: {
        campaignId: {
          in: campaignIds,
        },
      },
      _count: {
        id: true,
      },
    });

    // Initialize counters
    let sent = 0;
    let delivered = 0;
    let opened = 0;
    let bounced = 0;
    let failed = 0;

    // Process status counts
    for (const group of statusCounts) {
      const count = group._count.id;

      switch (group.status) {
        case "SENT":
          sent += count;
          break;
        case "DELIVERED":
          sent += count;
          delivered += count;
          break;
        case "OPENED":
          sent += count;
          delivered += count;
          opened += count;
          break;
        case "BOUNCED":
          sent += count;
          bounced += count;
          break;
        case "FAILED":
          sent += count;
          failed += count;
          break;
        case "PENDING":
          // Not counted as sent
          break;
      }
    }

    // Calculate rates (as percentages 0-100)
    const openRate = sent > 0 ? (opened / sent) * 100 : 0;
    const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0;
    const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;

    return {
      totalCampaigns,
      sent,
      delivered,
      opened,
      bounced,
      failed,
      openRate,
      deliveryRate,
      bounceRate,
    };
  } catch (error) {
    logger.error("Error getting global stats", {
      dateRange,
      error: String(error),
    });
    throw error;
  }
}

/**
 * Get recent campaign statistics for dashboard widget
 * Returns last N campaigns with their stats
 *
 * @param limit - Number of recent campaigns to return (default: 10)
 * @returns Array of CampaignStats ordered by campaign createdAt DESC
 */
export async function getRecentCampaignStats(
  limit = 10,
): Promise<CampaignStats[]> {
  try {
    // Get recent campaigns
    const campaigns = await prisma.emailCampaign.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        name: true,
      },
    });

    // Get stats for each campaign
    const statsPromises = campaigns.map(async (campaign) => {
      const stats = await getCampaignStats(campaign.id);
      return {
        ...stats,
        campaignName: campaign.name,
      };
    });

    const stats = await Promise.all(statsPromises);

    return stats;
  } catch (error) {
    logger.error("Error getting recent campaign stats", {
      limit,
      error: String(error),
    });
    throw error;
  }
}

/**
 * Get hourly open timeline for a campaign
 * Returns open event counts grouped by hour for charting
 *
 * @param campaignId - Campaign ID
 * @returns Array of {hour, count} ordered by hour ASC
 */
export async function getOpenTimeline(
  campaignId: string,
): Promise<TimelineDataPoint[]> {
  try {
    // Get all OPENED events for this campaign
    const events = await prisma.emailEvent.findMany({
      where: {
        eventType: "OPENED",
        recipient: {
          campaignId,
        },
      },
      select: {
        receivedAt: true,
      },
      orderBy: {
        receivedAt: "asc",
      },
    });

    // Group events by hour
    const hourCounts = new Map<string, number>();

    for (const event of events) {
      // Format hour as YYYY-MM-DD HH:00
      const hour = new Date(event.receivedAt);
      hour.setMinutes(0, 0, 0);
      const hourKey = hour.toISOString().slice(0, 13) + ":00";

      const currentCount = hourCounts.get(hourKey) || 0;
      hourCounts.set(hourKey, currentCount + 1);
    }

    // Convert map to array of data points
    const timeline: TimelineDataPoint[] = Array.from(hourCounts.entries()).map(
      ([hour, count]) => ({
        hour,
        count,
      }),
    );

    // Sort by hour ascending
    timeline.sort((a, b) => a.hour.localeCompare(b.hour));

    return timeline;
  } catch (error) {
    logger.error("Error getting open timeline", {
      campaignId,
      error: String(error),
    });
    throw error;
  }
}
