/**
 * Health Check: Critical Assets
 *
 * Verifies that critical static assets (images, fonts) are accessible.
 * Returns 200 if all assets load, 503 if any are missing.
 *
 * Use this endpoint for:
 * - Synthetic monitoring (Checkly, Datadog)
 * - Post-deployment verification
 * - Debugging "missing images" issues
 *
 * @example
 * ```bash
 * curl https://mirrorbuddy.vercel.app/api/health/assets
 * ```
 */

import { NextResponse } from "next/server";
import { CRITICAL_ASSETS, captureMessage } from "@/lib/sentry";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AssetCheckResult {
  asset: string;
  status: "pass" | "fail";
  httpStatus?: number;
  error?: string;
  latencyMs?: number;
}

export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();
  const results: AssetCheckResult[] = [];

  // Get base URL from environment or use relative paths
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Check each critical asset
  await Promise.all(
    CRITICAL_ASSETS.map(async (asset) => {
      const assetStart = Date.now();
      try {
        const response = await fetch(`${baseUrl}${asset}`, {
          method: "HEAD",
          cache: "no-cache",
          // Short timeout to fail fast
          signal: AbortSignal.timeout(5000),
        });

        results.push({
          asset,
          status: response.ok ? "pass" : "fail",
          httpStatus: response.status,
          latencyMs: Date.now() - assetStart,
        });
      } catch (error) {
        // Report error to Sentry for monitoring and alerts
        Sentry.captureException(error, {
          tags: { api: "/api/health/assets" },
        });

        results.push({
          asset,
          status: "fail",
          error: error instanceof Error ? error.message : "Unknown error",
          latencyMs: Date.now() - assetStart,
        });
      }
    }),
  );

  const failures = results.filter((r) => r.status === "fail");
  const allPassed = failures.length === 0;

  // Report failures to Sentry
  if (!allPassed) {
    captureMessage(
      `Critical assets health check failed: ${failures.length}/${results.length}`,
      "error",
      {
        errorType: "health-check-assets",
        tags: {
          failureCount: String(failures.length),
          totalAssets: String(results.length),
        },
        extra: {
          failures,
          baseUrl,
          checkDurationMs: Date.now() - startTime,
        },
      },
    );
  }

  return NextResponse.json(
    {
      status: allPassed ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        passed: results.filter((r) => r.status === "pass").length,
        failed: failures.length,
      },
      assets: results,
      checkDurationMs: Date.now() - startTime,
    },
    {
      status: allPassed ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
