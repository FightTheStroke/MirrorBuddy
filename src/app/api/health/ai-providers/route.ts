/**
 * GET /api/health/ai-providers — AI provider health check
 * Returns availability and latency for all registered providers
 * Created for F-08: Multi-Provider AI Router
 */

import { NextResponse } from "next/server";
import { pipe, withSentry } from "@/lib/api/middlewares";
import { aiRouter } from "@/lib/ai/providers/router";

export const GET = pipe(withSentry("/api/health/ai-providers"))(async () => {
  const health = await aiRouter.checkAllHealth();

  const allHealthy = health.every((h) => h.available);

  return NextResponse.json({
    status: allHealthy ? "healthy" : "degraded",
    providers: health.map((h) => ({
      provider: h.provider,
      available: h.available,
      latencyMs: h.latencyMs,
      lastError: h.lastError,
      lastChecked: h.lastChecked.toISOString(),
    })),
  });
});
