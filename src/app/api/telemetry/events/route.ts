// ============================================================================
// API ROUTE: Telemetry Events
// POST: Receive and store batched telemetry events
// ============================================================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { TelemetryCategory } from '@/lib/telemetry/types';

const VALID_CATEGORIES: TelemetryCategory[] = [
  'navigation',
  'education',
  'conversation',
  'maestro',
  'tools',
  'accessibility',
  'error',
  'performance',
];

interface EventPayload {
  events: Array<{
    id: string;
    timestamp: string;
    category: string;
    action: string;
    label?: string;
    value?: number;
    metadata?: Record<string, string | number | boolean>;
    sessionId: string;
  }>;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    // Handle empty or malformed JSON body gracefully
    let body: EventPayload;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return NextResponse.json({ stored: 0 });
      }
      body = JSON.parse(text);
    } catch {
      // Empty body or cancelled request - not an error, just nothing to store
      return NextResponse.json({ stored: 0 });
    }

    if (!body.events || !Array.isArray(body.events)) {
      return NextResponse.json({ error: 'Invalid events payload' }, { status: 400 });
    }

    // Validate and filter events
    const validEvents = body.events.filter((event) => {
      if (!event.id || !event.category || !event.action || !event.sessionId) {
        return false;
      }
      if (!VALID_CATEGORIES.includes(event.category as TelemetryCategory)) {
        return false;
      }
      return true;
    });

    if (validEvents.length === 0) {
      return NextResponse.json({ stored: 0 });
    }

    // Filter out already existing events (avoid duplicates on retry)
    const existingIds = await prisma.telemetryEvent.findMany({
      where: {
        eventId: { in: validEvents.map((e) => e.id) },
      },
      select: { eventId: true },
    });
    const existingIdSet = new Set(existingIds.map((e) => e.eventId));
    const newEvents = validEvents.filter((e) => !existingIdSet.has(e.id));

    if (newEvents.length === 0) {
      return NextResponse.json({ stored: 0 });
    }

    // Store events in database
    const created = await prisma.telemetryEvent.createMany({
      data: newEvents.map((event) => ({
        eventId: event.id,
        timestamp: new Date(event.timestamp),
        category: event.category,
        action: event.action,
        label: event.label || null,
        value: event.value || null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        sessionId: event.sessionId,
        userId: userId || null,
      })),
    });

    return NextResponse.json({ stored: created.count });
  } catch (error) {
    logger.error('Telemetry events POST error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to store telemetry events' },
      { status: 500 }
    );
  }
}
