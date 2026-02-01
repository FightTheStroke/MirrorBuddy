/**
 * Test endpoint for Supabase limits module
 * GET /api/test/supabase-limits
 *
 * This is a temporary test endpoint for development.
 * Should be removed or protected in production.
 */

import { NextResponse } from "next/server";
import { pipe, withSentry } from "@/lib/api/middlewares";
import {
  getSupabaseLimits,
  isResourceStressed,
  getStressReport,
} from "@/lib/observability/supabase-limits";

export const GET = pipe(withSentry("/api/test/supabase-limits"))(async () => {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Test endpoint not available in production" },
      { status: 404 },
    );
  }

  const [limits, isStressed, report] = await Promise.all([
    getSupabaseLimits(),
    isResourceStressed(80),
    getStressReport(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      limits,
      isStressed,
      report,
    },
    timestamp: new Date().toISOString(),
  });
});
