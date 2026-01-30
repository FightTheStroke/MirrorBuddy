/**
 * Health Aggregator API Route
 * Returns aggregated health status for all external services
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { aggregateHealth } from "@/lib/admin/health-aggregator";
import { logger } from "@/lib/logger";

/**
 * GET - Fetch aggregated health status for all services
 */
export async function GET(_request: NextRequest) {
  try {
    // Validate admin authentication
    const adminAuth = await validateAdminAuth();
    if (!adminAuth.authenticated || !adminAuth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get aggregated health data (with caching)
    const healthData = await aggregateHealth();

    return NextResponse.json(healthData);
  } catch (error) {
    logger.error("Failed to fetch health aggregator data:", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch health data" },
      { status: 500 },
    );
  }
}
