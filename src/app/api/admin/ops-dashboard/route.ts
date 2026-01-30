/**
 * Ops Dashboard API Routes
 * Real-time metrics endpoint for admin operations dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { getOpsDashboardData } from "@/lib/admin/ops-dashboard-service";
import { logger } from "@/lib/logger";

/**
 * GET - Fetch real-time ops metrics
 */
export async function GET(_request: NextRequest) {
  try {
    // Validate admin authentication
    const adminAuth = await validateAdminAuth();
    if (!adminAuth.authenticated || !adminAuth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch metrics (cached for 30 seconds)
    const data = await getOpsDashboardData();

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Failed to fetch ops dashboard metrics:", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 },
    );
  }
}
