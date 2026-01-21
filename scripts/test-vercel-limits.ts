/**
 * Test script for Vercel Limits API
 *
 * Usage: npx tsx scripts/test-vercel-limits.ts
 *
 * Requires environment variables:
 *   - VERCEL_TOKEN
 *   - VERCEL_PROJECT_ID (optional)
 *   - VERCEL_TEAM_ID (optional)
 */

import { getVercelLimits } from "../src/lib/observability/vercel-limits";

async function main() {
  console.log("Testing Vercel Limits API...\n");

  // Check environment variables
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  console.log("Configuration:");
  console.log(`  VERCEL_TOKEN: ${token ? "✓ Set" : "✗ Missing"}`);
  console.log(`  VERCEL_PROJECT_ID: ${projectId || "Not set (will auto-detect)"}`);
  console.log(`  VERCEL_TEAM_ID: ${teamId || "Not set (personal account)"}`);
  console.log();

  if (!token) {
    console.error("❌ VERCEL_TOKEN is required");
    console.error("   Get your token at: https://vercel.com/account/tokens");
    process.exit(1);
  }

  try {
    const limits = await getVercelLimits();

    if (limits.error) {
      console.error("❌ Error fetching limits:", limits.error);
      process.exit(1);
    }

    console.log("✅ Vercel Limits fetched successfully!\n");

    console.log("Bandwidth:");
    console.log(`  Used: ${formatBytes(limits.bandwidth.used)}`);
    console.log(`  Limit: ${formatBytes(limits.bandwidth.limit)}`);
    console.log(`  Usage: ${limits.bandwidth.percent.toFixed(2)}%`);
    console.log();

    console.log("Build Minutes:");
    console.log(`  Used: ${limits.builds.used} minutes`);
    console.log(`  Limit: ${limits.builds.limit} minutes`);
    console.log(`  Usage: ${limits.builds.percent.toFixed(2)}%`);
    console.log();

    console.log("Function Invocations:");
    console.log(`  Used: ${limits.functions.used.toLocaleString()}`);
    console.log(`  Limit: ${limits.functions.limit.toLocaleString()}`);
    console.log(`  Usage: ${limits.functions.percent.toFixed(2)}%`);
    console.log();

    console.log(`Timestamp: ${new Date(limits.timestamp).toISOString()}`);

    // Check for warnings
    const warnings: string[] = [];
    if (limits.bandwidth.percent > 80) {
      warnings.push(`⚠️  Bandwidth usage is at ${limits.bandwidth.percent.toFixed(1)}%`);
    }
    if (limits.builds.percent > 80) {
      warnings.push(`⚠️  Build minutes usage is at ${limits.builds.percent.toFixed(1)}%`);
    }
    if (limits.functions.percent > 80) {
      warnings.push(`⚠️  Function invocations usage is at ${limits.functions.percent.toFixed(1)}%`);
    }

    if (warnings.length > 0) {
      console.log("\n⚠️  Warnings:");
      warnings.forEach((w) => console.log(`   ${w}`));
    }

    // Test cache (second call should be instant)
    console.log("\nTesting cache...");
    const startTime = Date.now();
    const _cachedLimits = await getVercelLimits();
    const duration = Date.now() - startTime;

    if (duration < 50) {
      console.log(`✅ Cache working (${duration}ms)`);
    } else {
      console.log(`❌ Cache not working (${duration}ms)`);
    }

    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

/**
 * Format bytes as human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

main();
