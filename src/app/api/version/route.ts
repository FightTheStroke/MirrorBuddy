// ============================================================================
// API ROUTE: Version information
// Returns app version for display in UI and health checks
// ============================================================================

import { NextResponse } from "next/server";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { getAppVersion } from "@/lib/version";

export async function GET() {
  const version = getAppVersion();
  const buildTime = process.env.BUILD_TIME || new Date().toISOString();

  const response = NextResponse.json({
    version,
    buildTime,
    name: "MirrorBuddy Web",
    environment: process.env.NODE_ENV || "development",
  });

  // Add HTTP Cache-Control headers for static version data
  const cacheControl = getCacheControlHeader({
    ttl: CACHE_TTL.VERSION,
    visibility: "public",
    cdnTtl: CACHE_TTL.VERSION,
  });
  response.headers.set("Cache-Control", cacheControl);

  return response;
}
