// ============================================================================
// API ROUTE: Safety Events
// GET: Safety monitoring statistics for dashboard
// POST: Resolve a safety event
// SECURITY: Requires authentication
// ============================================================================

import { NextResponse } from 'next/server';
import {
  getSafetyEventsFromDb,
  getSafetyStatsFromDb,
  resolveSafetyEvent,
} from '@/lib/safety/monitoring';
import { logger } from '@/lib/logger';
import { validateAuth } from '@/lib/auth/session-auth';

export async function GET(request: Request) {
  try {
    // Require authentication for admin dashboard
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') ?? '7', 10);
    const severity = searchParams.get('severity') ?? undefined;
    const unresolvedOnly = searchParams.get('unresolved') === 'true';
    const limit = parseInt(searchParams.get('limit') ?? '100', 10);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get events and stats
    const [eventsResult, stats] = await Promise.all([
      getSafetyEventsFromDb({
        startDate,
        endDate,
        severity,
        unresolvedOnly,
        limit,
      }),
      getSafetyStatsFromDb(startDate, endDate),
    ]);

    // Daily breakdown
    const dailyEvents: Record<string, number> = {};
    for (const event of eventsResult.events) {
      const day = event.timestamp.toISOString().split('T')[0];
      dailyEvents[day] = (dailyEvents[day] || 0) + 1;
    }

    return NextResponse.json({
      period: { days, startDate: startDate.toISOString() },
      summary: {
        totalEvents: stats.totalEvents,
        unresolvedCount: stats.unresolvedCount,
        criticalCount: stats.criticalCount,
      },
      bySeverity: stats.bySeverity,
      byType: stats.byType,
      dailyEvents,
      recentEvents: eventsResult.events.slice(0, 20).map(e => ({
        id: e.id,
        type: e.type,
        severity: e.severity,
        timestamp: e.timestamp,
        resolved: !!e.resolvedAt,
      })),
    });
  } catch (error) {
    logger.error('Dashboard safety-events error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch safety stats' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Require authentication for admin action
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, resolvedBy, resolution } = body;

    if (!eventId || !resolvedBy || !resolution) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, resolvedBy, resolution' },
        { status: 400 }
      );
    }

    await resolveSafetyEvent(eventId, resolvedBy, resolution);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Dashboard safety-events resolve error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to resolve safety event' },
      { status: 500 }
    );
  }
}
