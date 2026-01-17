/**
 * API Route: Safety Events
 *
 * POST /api/safety/events
 *
 * Persists safety events to database for compliance tracking.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";
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

export async function POST(request: NextRequest) {
  try {
    const auth = await validateAuth();
    const userId = auth.authenticated && auth.userId ? auth.userId : null;

    const body = (await request.json()) as SafetyEventBody;
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

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to persist safety event", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to save event" },
      { status: 500 },
    );
  }
}
