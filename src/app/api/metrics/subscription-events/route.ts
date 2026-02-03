/**
 * POST /api/metrics/subscription-events
 * Receive subscription telemetry events from clients
 * Logs events for analytics and monitoring
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { pipe, withSentry, withCSRF } from "@/lib/api/middlewares";

interface SubscriptionEventPayload {
  type: string;
  userId: string;
  tierId: string;
  previousTierId?: string | null;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export const POST = pipe(
  withSentry("/api/metrics/subscription-events"),
  withCSRF,
)(async (ctx) => {
  const body: SubscriptionEventPayload = await ctx.req.json();

  // Validate required fields
  if (!body.type || !body.userId || !body.tierId || !body.timestamp) {
    return NextResponse.json(
      { error: "Missing required fields: type, userId, tierId, timestamp" },
      { status: 400 },
    );
  }

  // Validate event type
  const validEventTypes = [
    "subscription.created",
    "subscription.upgraded",
    "subscription.downgraded",
    "subscription.cancelled",
    "subscription.expired",
  ];

  if (!validEventTypes.includes(body.type)) {
    return NextResponse.json(
      { error: `Invalid event type: ${body.type}` },
      { status: 400 },
    );
  }

  // Log the event
  logger.info("[Subscription Telemetry API] Event received", {
    eventType: body.type,
    userId: body.userId,
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
