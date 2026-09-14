// ============================================================================
// API ROUTE: Telemetry Events
// POST: Receive and store batched telemetry events
// ============================================================================

import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db';
import { pipe, withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';
import { getCorsHeaders } from '@/lib/security';
import { safeReadJson } from '@/lib/api/safe-json';
import { telemetryPayloadSchema } from '@/lib/telemetry/ingestion-contract';
import {
  canCollectOptionalAnalytics,
  optionalAnalyticsDenied,
} from '@/lib/telemetry/optional-analytics-server';

// Handle CORS preflight
// F-04: Get CORS headers based on request origin (no wildcard in production)

export const revalidate = 0;
const EVENT_NAMESPACE = 'telemetry:v1:';
export const OPTIONS = pipe(withSentry('/api/telemetry/events'))(async (ctx) => {
  const requestOrigin = ctx.req.headers.get('origin');
  const corsHeaders = getCorsHeaders(requestOrigin);
  return NextResponse.json({}, { headers: corsHeaders });
});

export const POST = pipe(
  withSentry('/api/telemetry/events'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  // F-04: Get CORS headers based on request origin (no wildcard in production)
  const requestOrigin = ctx.req.headers.get('origin');
  const corsHeaders = getCorsHeaders(requestOrigin);
  const userId = ctx.userId;
  if (!userId || !(await canCollectOptionalAnalytics(userId))) return optionalAnalyticsDenied();
  const parsed = telemetryPayloadSchema.safeParse(await safeReadJson(ctx.req));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid events payload' },
      { status: 400, headers: corsHeaders },
    );
  }

  // The database key is globally unique: namespace the untrusted client ID by authenticated owner.
  const validEvents = parsed.data.events.map((event) => ({
    ...event,
    storageId:
      EVENT_NAMESPACE +
      createHash('sha256')
        .update(JSON.stringify([userId, event.id]))
        .digest('hex'),
  }));

  if (validEvents.length === 0) {
    return NextResponse.json({ stored: 0 }, { headers: corsHeaders });
  }

  // Filter out already existing events (avoid duplicates on retry)
  const existingIds = await prisma.telemetryEvent.findMany({
    where: {
      userId,
      eventId: {
        in: validEvents.flatMap((event) => [
          event.storageId,
          ...(event.id.startsWith(EVENT_NAMESPACE) ? [] : [event.id]),
        ]),
      },
    },
    select: { eventId: true },
  });
  const existingIdSet = new Set(existingIds.map((e) => e.eventId));
  const newEvents = validEvents.filter(
    (event) =>
      !existingIdSet.has(event.storageId) &&
      (event.id.startsWith(EVENT_NAMESPACE) || !existingIdSet.has(event.id)),
  );

  if (newEvents.length === 0) {
    return NextResponse.json({ stored: 0 }, { headers: corsHeaders });
  }

  // Store events in database
  const created = await prisma.telemetryEvent.createMany({
    skipDuplicates: true,
    data: newEvents.map((event) => ({
      eventId: event.storageId,
      timestamp: new Date(event.timestamp),
      category: event.category,
      action: event.action,
      label: event.label || null,
      value: event.value ?? null,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      sessionId: event.sessionId,
      userId,
    })),
  });

  return NextResponse.json({ stored: created.count }, { headers: corsHeaders });
});
