/**
 * API Route: Safety Events
 *
 * POST /api/safety/events
 *
 * Persists safety events to database for compliance tracking.
 */

import { NextResponse } from "next/server";
import { pipe, withSentry } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { validateAuth } from "@/lib/auth";
import { triggerAdminCountsUpdate } from "@/lib/helpers/publish-admin-counts";
import type {
  SafetyEventType,
  EventSeverity,
} from "@/lib/safety/monitoring/types";

interface SafetyEventBody {
  type: SafetyEventType;
  severity: EventSeverity;
  sessionId?: string;
  userId?: string;
  category?: string;
}

// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- accepts both authenticated and anonymous users for safety event logging
export const POST = pipe(withSentry("/api/safety/events"))(async (ctx) => {
  const auth = await validateAuth();
  const userId = auth.authenticated && auth.userId ? auth.userId : null;

  const body = (await ctx.req.json()) as SafetyEventBody;
  const { type, severity, sessionId, category } = body;

  if (!type || !severity) {
    return NextResponse.json(
      { error: "type and severity are required" },
      { status: 400 },
    );
  }

  await prisma.safetyEvent.create({
    data: {
      userId: userId ?? null,
      type,
      severity,
      conversationId: sessionId ?? null,
      resolvedBy: null,
      resolvedAt: null,
      resolution: category ?? null,
    },
  });

  // Trigger admin counts push (F-32: non-blocking, rate-limited per event type)
  triggerAdminCountsUpdate("safety");

  return NextResponse.json({ success: true });
});
