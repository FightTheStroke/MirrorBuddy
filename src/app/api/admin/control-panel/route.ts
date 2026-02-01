/**
 * Control Panel Admin API
 * GET: Retrieve current state
 * POST: Update feature flags, maintenance mode, kill switch, or tier limits
 */

import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import {
  getControlPanelState,
  handleUpdateFeatureFlag,
  updateMaintenanceMode,
  handleUpdateGlobalKillSwitch,
  handleUpdateTierLimit,
} from "@/lib/admin/control-panel-service";

/**
 * GET /api/admin/control-panel
 * Retrieve all control panel state
 */
export const GET = pipe(
  withSentry("/api/admin/control-panel"),
  withAdmin,
)(async (_ctx) => {
  const state = await getControlPanelState();
  return NextResponse.json({ success: true, data: state });
});
/**
 * POST /api/admin/control-panel
 * Update control panel state
 * Body: { action: 'feature-flag' | 'maintenance' | 'kill-switch' | 'tier-limit', data: {...} }
 */
export const POST = pipe(
  withSentry("/api/admin/control-panel"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = await ctx.req.json();
  const { action, data } = body;

  if (!action || !data) {
    return NextResponse.json(
      { error: "Action and data are required" },
      { status: 400 },
    );
  }

  let result;

  switch (action) {
    case "feature-flag":
      result = await handleUpdateFeatureFlag(
        data.flagId,
        data.update,
        ctx.userId || "unknown",
      );
      logger.info("Feature flag updated", {
        flagId: data.flagId,
        userId: ctx.userId,
      });
      break;

    case "maintenance":
      result = updateMaintenanceMode(data);
      logger.info("Maintenance mode updated", {
        isEnabled: data.isEnabled,
        userId: ctx.userId,
      });
      break;

    case "kill-switch":
      result = await handleUpdateGlobalKillSwitch(
        data.isEnabled,
        data.reason,
        ctx.userId || "unknown",
      );
      logger.warn("Global kill switch toggled", {
        isEnabled: data.isEnabled,
        userId: ctx.userId,
      });
      break;

    case "tier-limit":
      result = await handleUpdateTierLimit(
        data.tierId,
        data.update,
        ctx.userId || "unknown",
      );
      logger.info("Tier limit updated", {
        tierId: data.tierId,
        userId: ctx.userId,
      });
      break;

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: result });
});
