/**
 * Infrastructure Panel API Route
 * Admin-only endpoint for infrastructure metrics
 */

import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { getInfraMetrics } from "@/lib/admin/infra-panel-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/infra-panel
 * Returns Vercel, Supabase, and Redis metrics
 */
export async function GET() {
  try {
    // Validate admin authentication
    const adminAuth = await validateAdminAuth();
    if (!adminAuth.authenticated || !adminAuth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Fetching infrastructure metrics", {
      userId: adminAuth.userId,
    });

    // Get all infrastructure metrics
    const metrics = await getInfraMetrics();

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error("Error in infra-panel API", {
      error: String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to fetch infrastructure metrics",
        details: String(error),
      },
      { status: 500 },
    );
  }
}
