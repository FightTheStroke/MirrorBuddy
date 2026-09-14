/**
 * POST /api/metrics/subscription-events
 * Receive subscription telemetry events from clients
 * Logs events for analytics and monitoring
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { pipe, withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';
import { z } from 'zod';
import { safeReadJson } from '@/lib/api/safe-json';
import {
  canCollectOptionalAnalytics,
  optionalAnalyticsDenied,
} from '@/lib/telemetry/optional-analytics-server';

export const revalidate = 0;
const payloadSchema = z.object({
  type: z.enum([
    'subscription.created',
    'subscription.upgraded',
    'subscription.downgraded',
    'subscription.cancelled',
    'subscription.expired',
  ]),
  tierId: z.string().min(1).max(128),
  previousTierId: z.string().max(128).nullable().optional(),
  timestamp: z.string().datetime({ offset: true }),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const POST = pipe(
  withSentry('/api/metrics/subscription-events'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  if (!(await canCollectOptionalAnalytics(ctx.userId))) return optionalAnalyticsDenied();
  const parsed = payloadSchema.safeParse(await safeReadJson(ctx.req));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid subscription event' }, { status: 400 });
  const body = parsed.data;
  const userId = ctx.userId!;

  // Log the event
  logger.info('[Subscription Telemetry API] Event received', {
    eventType: body.type,
    userId,
    tierId: body.tierId,
    previousTierId: body.previousTierId,
    timestamp: body.timestamp,
    hasMetadata: Boolean(body.metadata),
  });

  // In production, you might want to:
  // 1. Store events in a data warehouse
  // 2. Send to external analytics service
  // 3. Update Prometheus metrics
  // For now, logging is sufficient for audit trail

  return NextResponse.json(
    { success: true, eventType: body.type },
    { status: 202 }, // Accepted
  );
});
