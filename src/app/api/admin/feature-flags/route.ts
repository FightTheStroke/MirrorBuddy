/**
 * Feature Flags Admin API
 *
 * V1Plan FASE 2.0.6: CRUD operations for feature flag management
 *
 * GET /api/admin/feature-flags - List all flags
 * GET /api/admin/feature-flags?health=true - Include health/degradation status
 * GET /api/admin/feature-flags?gonogo=true - Include GO/NO-GO checks
 * GET /api/admin/feature-flags?costs=true - Include cost stats and voice sessions
 * POST /api/admin/feature-flags - Update a flag
 * DELETE /api/admin/feature-flags?id=xxx - Activate kill-switch
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import {
  getAllFlags,
  getFlag,
  updateFlag,
  activateKillSwitch,
  deactivateKillSwitch,
  setGlobalKillSwitch,
  isGlobalKillSwitchActive,
} from "@/lib/feature-flags";
import type {
  KnownFeatureFlag,
  FeatureFlagUpdate,
} from "@/lib/feature-flags/types";
import { getDegradationState, getRecentEvents } from "@/lib/degradation";
import {
  runGoNoGoChecks,
  getActiveAlerts,
  getAllSLOStatuses,
} from "@/lib/alerting";
import {
  getCostMetricsSummary,
  getActiveVoiceSessions,
  getVoiceLimits,
} from "@/lib/metrics";


export const revalidate = 0;
interface UpdateFlagRequest {
  featureId: KnownFeatureFlag;
  update: FeatureFlagUpdate;
}

interface KillSwitchRequest {
  featureId?: KnownFeatureFlag;
  global?: boolean;
  enabled: boolean;
  reason?: string;
}

/**
 * GET /api/admin/feature-flags
 * Returns all flags with system health status
 */
export const GET = pipe(
  withSentry("/api/admin/feature-flags"),
  withAdmin,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const includeHealth = searchParams.get("health") === "true";
  const includeGoNogo = searchParams.get("gonogo") === "true";
  const includeCosts = searchParams.get("costs") === "true";

  const flags = getAllFlags();
  const globalKillSwitch = isGlobalKillSwitchActive();

  const response: Record<string, unknown> = {
    flags,
    globalKillSwitch,
    timestamp: new Date().toISOString(),
  };

  if (includeHealth) {
    response.degradation = getDegradationState();
    response.recentEvents = getRecentEvents(10);
    response.activeAlerts = getActiveAlerts();
    response.sloStatuses = getAllSLOStatuses();
  }

  if (includeGoNogo) {
    response.goNoGoResult = runGoNoGoChecks();
  }

  if (includeCosts) {
    response.costStats = await getCostMetricsSummary();
    response.activeVoiceSessions = getActiveVoiceSessions();
    response.voiceLimits = getVoiceLimits();
  }

  return NextResponse.json(response);
});

/**
 * POST /api/admin/feature-flags
 * Update a feature flag or toggle kill-switch
 */
export const POST = pipe(
  withSentry("/api/admin/feature-flags"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = await ctx.req.json();

  // Kill-switch operation
  if ("enabled" in body && (body.featureId || body.global)) {
    return handleKillSwitch(body as KillSwitchRequest);
  }

  // Flag update operation
  if (body.featureId && body.update) {
    return handleFlagUpdate(body as UpdateFlagRequest);
  }

  return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
});

/**
 * DELETE /api/admin/feature-flags?id=xxx
 * Activate kill-switch for a feature (emergency disable)
 */
export const DELETE = pipe(
  withSentry("/api/admin/feature-flags"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const featureId = searchParams.get("id") as KnownFeatureFlag | null;
  const reason = searchParams.get("reason") || "Emergency disable via API";

  if (!featureId) {
    return NextResponse.json(
      { error: "Feature ID is required" },
      { status: 400 },
    );
  }

  const flag = getFlag(featureId);
  if (!flag) {
    return NextResponse.json({ error: "Feature not found" }, { status: 404 });
  }

  activateKillSwitch(featureId, reason, "admin-api");

  logger.warn("Kill-switch activated via API", { featureId, reason });

  return NextResponse.json({
    success: true,
    featureId,
    killSwitch: true,
    message: `Kill-switch activated for ${featureId}`,
  });
});

// Handle flag update
function handleFlagUpdate(body: UpdateFlagRequest) {
  const { featureId, update } = body;

  const flag = getFlag(featureId);
  if (!flag) {
    return NextResponse.json({ error: "Feature not found" }, { status: 404 });
  }

  const updated = updateFlag(featureId, {
    ...update,
    updatedBy: "admin-api",
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Failed to update flag" },
      { status: 500 },
    );
  }

  logger.info("Feature flag updated via API", { featureId, update });

  return NextResponse.json({
    success: true,
    flag: updated,
  });
}

// Handle kill-switch toggle
function handleKillSwitch(body: KillSwitchRequest) {
  const { featureId, global, enabled, reason } = body;

  if (global) {
    setGlobalKillSwitch(enabled, reason);
    return NextResponse.json({
      success: true,
      globalKillSwitch: enabled,
      message: enabled
        ? "Global kill-switch activated"
        : "Global kill-switch deactivated",
    });
  }

  if (featureId) {
    if (enabled) {
      activateKillSwitch(featureId, reason || "API request", "admin-api");
    } else {
      deactivateKillSwitch(featureId, "admin-api");
    }

    return NextResponse.json({
      success: true,
      featureId,
      killSwitch: enabled,
      message: enabled
        ? `Kill-switch activated for ${featureId}`
        : `Kill-switch deactivated for ${featureId}`,
    });
  }

  return NextResponse.json(
    { error: "Either featureId or global must be specified" },
    { status: 400 },
  );
}
