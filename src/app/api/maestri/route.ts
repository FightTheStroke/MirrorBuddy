import { NextResponse } from "next/server";
import { maestri } from "@/data/index";
import { getOrCompute, CACHE_TTL } from "@/lib/cache";
import { apiHandler } from "@/lib/api";

/**
 * GET /api/maestri
 * Returns all maestri data for testing and external use
 * WAVE 3: Added caching for performance
 */
export const GET = apiHandler(async () => {
  // Cache maestri list (static data, rarely changes)
  const cachedMaestri = await getOrCompute("maestri:list", () => maestri, {
    ttl: CACHE_TTL.MAESTRI,
  });

  // Add HTTP caching headers for browser/CDN caching (1 hour)
  return NextResponse.json(cachedMaestri, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});
