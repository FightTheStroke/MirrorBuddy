#!/usr/bin/env tsx
/**
 * Vercel Baseline Metrics Measurement
 *
 * Captures current Vercel metrics snapshot including:
 * - Invocations per route
 * - CPU time (P75 duration)
 * - Error rates
 * - Estimated costs
 *
 * Saves snapshot to: scripts/vercel-baseline-snapshot.json
 * For use in tracking optimization progress (polling → SSE push)
 */

import * as fs from "fs";
import * as path from "path";
import { getGitInfo } from "./lib/git-utils";
import {
  fetchVercelMetrics,
  calculateTotals,
  type RouteMetrics,
} from "./lib/vercel-api";

interface VercelSnapshot {
  timestamp: string;
  branch: string;
  commit: string;
  routes: Record<string, RouteMetrics>;
  totals: {
    invocations_per_day: number;
    estimated_cpu_seconds: number;
    estimated_daily_cost_usd: number;
  };
  metadata: {
    script_version: string;
    captured_by: string;
    notes: string;
  };
}

/**
 * Main execution
 */
async function main() {
  console.log("Starting Vercel baseline metrics capture...\n");

  try {
    const { branch, commit } = await getGitInfo();
    console.log(`Git info: ${branch} (${commit})`);

    const routes = await fetchVercelMetrics();
    console.log(`Captured metrics for ${Object.keys(routes).length} routes`);

    const totals = calculateTotals(routes);

    const snapshot: VercelSnapshot = {
      timestamp: new Date().toISOString(),
      branch,
      commit,
      routes,
      totals,
      metadata: {
        script_version: "1.0.0",
        captured_by: "measure-vercel-baseline.ts",
        notes:
          "Baseline metrics for tracking optimization progress (polling → SSE push)",
      },
    };

    const outputPath = path.resolve(__dirname, "vercel-baseline-snapshot.json");
    fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2));

    console.log(`\nSnapshot saved to: ${outputPath}`);
    console.log(`\nBaseline Summary:`);
    console.log(`  Total invocations/day: ${totals.invocations_per_day}`);
    console.log(`  Estimated CPU seconds: ${totals.estimated_cpu_seconds}`);
    console.log(`  Estimated daily cost: $${totals.estimated_daily_cost_usd}`);
    console.log(`  Timestamp: ${snapshot.timestamp}`);
  } catch (error) {
    console.error("Error during baseline measurement:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
