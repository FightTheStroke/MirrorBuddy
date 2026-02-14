/**
 * Ops Dashboard API Routes
 * Real-time metrics endpoint for admin operations dashboard
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { getOpsDashboardData } from "@/lib/admin/ops-dashboard-service";

/**
 * GET - Fetch real-time ops metrics
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/admin/ops-dashboard"),
  withAdmin,
)(async (_ctx) => {
  // Fetch metrics (cached for 30 seconds)
  const data = await getOpsDashboardData();

  return NextResponse.json(data);
});
