/**
 * Health Aggregator API Route
 * Returns aggregated health status for all external services
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { aggregateHealth } from "@/lib/admin/health-aggregator";

/**
 * GET - Fetch aggregated health status for all services
 */
export const GET = pipe(
  withSentry("/api/admin/health-aggregator"),
  withAdmin,
)(async (_ctx) => {
  // Get aggregated health data (with caching)
  const healthData = await aggregateHealth();

  return NextResponse.json(healthData);
});
