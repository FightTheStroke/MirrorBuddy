/**
 * Test script for Supabase limits module
 *
 * Run: npx tsx scripts/test-supabase-limits.ts
 */

import {
  getSupabaseLimits,
  isResourceStressed,
  getStressReport,
} from "../src/lib/observability/supabase-limits";

async function main() {
  console.log("Testing Supabase Limits Module\n");
  console.log("================================\n");

  try {
    // Test 1: Get full limits
    console.log("1. Getting Supabase limits...");
    const limits = await getSupabaseLimits();
    console.log("✓ Limits retrieved successfully");
    console.log(JSON.stringify(limits, null, 2));
    console.log();

    // Test 2: Check resource stress
    console.log("2. Checking resource stress (threshold: 80%)...");
    const isStressed = await isResourceStressed(80);
    console.log(`✓ Resource stress check: ${isStressed ? "STRESSED" : "OK"}`);
    console.log();

    // Test 3: Get stress report
    console.log("3. Getting stress report...");
    const report = await getStressReport();
    console.log("✓ Stress report:");
    console.log(report);
    console.log();

    console.log("================================");
    console.log("All tests passed!");
  } catch (error) {
    console.error("Error during testing:", error);
    process.exit(1);
  }
}

main();
