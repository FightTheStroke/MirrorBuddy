/**
 * Control Panel Admin API
 * GET: Retrieve current state
 * POST: Update feature flags, maintenance mode, kill switch, or tier limits
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
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
export async function GET(_request: NextRequest) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const state = await getControlPanelState();
    return NextResponse.json({ success: true, data: state });
  } catch (error) {
    logger.error("Failed to fetch control panel state", {}, error as Error);
    return NextResponse.json(
      { error: "Failed to fetch control panel state" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/control-panel
 * Update control panel state
 * Body: { action: 'feature-flag' | 'maintenance' | 'kill-switch' | 'tier-limit', data: {...} }
 */
export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
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
          auth.userId || "unknown",
        );
        logger.info("Feature flag updated", { flagId: data.flagId, auth });
        break;

      case "maintenance":
        result = updateMaintenanceMode(data);
        logger.info("Maintenance mode updated", {
          isEnabled: data.isEnabled,
          auth,
        });
        break;

      case "kill-switch":
        result = await handleUpdateGlobalKillSwitch(
          data.isEnabled,
          data.reason,
          auth.userId || "unknown",
        );
        logger.warn("Global kill switch toggled", {
          isEnabled: data.isEnabled,
          auth,
        });
        break;

      case "tier-limit":
        result = await handleUpdateTierLimit(
          data.tierId,
          data.update,
          auth.userId || "unknown",
        );
        logger.info("Tier limit updated", { tierId: data.tierId, auth });
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    logger.error("Failed to update control panel", {}, error as Error);
    return NextResponse.json(
      { error: "Failed to update control panel state" },
      { status: 500 },
    );
  }
}
