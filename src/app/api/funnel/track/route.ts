/**
 * Funnel Event Tracking API
 * Records user journey through conversion funnel stages
 * Plan 069 - Conversion Funnel Dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { recordFunnelEvent, type FunnelStage } from "@/lib/funnel";
import { logger } from "@/lib/logger";
import { getVisitorIdFromCookie } from "@/lib/trial/visitor-id";

const log = logger.child({ module: "api/funnel/track" });

const VALID_STAGES: FunnelStage[] = [
  "VISITOR",
  "TRIAL_START",
  "TRIAL_ENGAGED",
  "LIMIT_HIT",
  "BETA_REQUEST",
  "APPROVED",
  "FIRST_LOGIN",
  "ACTIVE",
  "CHURNED",
];

interface TrackRequest {
  stage: FunnelStage;
  fromStage?: FunnelStage;
  metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as TrackRequest;
    const { stage, fromStage, metadata } = body;

    // Validate stage
    if (!stage || !VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: "Invalid stage", validStages: VALID_STAGES },
        { status: 400 },
      );
    }

    // Get visitor ID from cookie
    const visitorId = getVisitorIdFromCookie(request);

    if (!visitorId) {
      log.warn("No visitor ID for funnel tracking");
      return NextResponse.json({ error: "No visitor ID" }, { status: 400 });
    }

    // Record the funnel event
    await recordFunnelEvent({
      visitorId,
      stage,
      fromStage,
      metadata: {
        ...metadata,
        userAgent: request.headers.get("user-agent") || undefined,
        referrer: request.headers.get("referer") || undefined,
      },
    });

    log.info("Funnel event recorded", { visitorId, stage, fromStage });

    return NextResponse.json({ success: true, stage });
  } catch (error) {
    log.error("Failed to record funnel event", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to record event" },
      { status: 500 },
    );
  }
}
