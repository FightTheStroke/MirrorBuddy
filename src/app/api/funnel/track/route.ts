/**
 * Funnel Event Tracking API
 * Records user journey through conversion funnel stages
 * Plan 069 - Conversion Funnel Dashboard
 */

import { NextResponse } from "next/server";
import { pipe, withSentry } from "@/lib/api/middlewares";
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

// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- public analytics endpoint, visitor cookie only, no session auth
export const POST = pipe(withSentry("/api/funnel/track"))(async (ctx) => {
  const body = (await ctx.req.json()) as TrackRequest;
  const { stage, fromStage, metadata } = body;

  // Validate stage
  if (!stage || !VALID_STAGES.includes(stage)) {
    return NextResponse.json(
      { error: "Invalid stage", validStages: VALID_STAGES },
      { status: 400 },
    );
  }

  // Get visitor ID from cookie
  const visitorId = getVisitorIdFromCookie(ctx.req);

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
      userAgent: ctx.req.headers.get("user-agent") || undefined,
      referrer: ctx.req.headers.get("referer") || undefined,
    },
  });

  log.info("Funnel event recorded", { visitorId, stage, fromStage });

  return NextResponse.json({ success: true, stage });
});
