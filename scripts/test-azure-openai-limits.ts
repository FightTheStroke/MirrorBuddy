#!/usr/bin/env tsx
/**
 * Test script for Azure OpenAI limits integration
 *
 * Tests the Azure Monitor Metrics API integration for real-time TPM/RPM usage.
 *
 * Usage:
 *   npx tsx scripts/test-azure-openai-limits.ts
 *
 * Requirements:
 *   - AZURE_OPENAI_ENDPOINT configured
 *   - Azure service principal credentials (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)
 *   - AZURE_SUBSCRIPTION_ID
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment from .env.local or .env
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

// Import after env is loaded
import { getAzureOpenAILimits, isAzureOpenAIStressed, getAzureOpenAIStressReport } from "../src/lib/observability/azure-openai-limits";

async function main() {
  console.log("=== Azure OpenAI Limits Test ===\n");

  // Check configuration
  console.log("Configuration:");
  console.log(`  AZURE_OPENAI_ENDPOINT: ${process.env.AZURE_OPENAI_ENDPOINT ? "✓" : "✗"}`);
  console.log(`  AZURE_SUBSCRIPTION_ID: ${process.env.AZURE_SUBSCRIPTION_ID ? "✓" : "✗"}`);
  console.log(`  AZURE_TENANT_ID: ${process.env.AZURE_TENANT_ID ? "✓" : "✗"}`);
  console.log(`  AZURE_CLIENT_ID: ${process.env.AZURE_CLIENT_ID ? "✓" : "✗"}`);
  console.log(`  AZURE_CLIENT_SECRET: ${process.env.AZURE_CLIENT_SECRET ? "✓" : "✗"}`);
  console.log();

  // Test 1: Get limits
  console.log("Test 1: getAzureOpenAILimits()");
  try {
    const limits = await getAzureOpenAILimits();

    if (limits.error) {
      console.log(`  ⚠️  Error: ${limits.error}`);
    } else {
      console.log(`  ✓ TPM: ${limits.tpm.used}/${limits.tpm.limit} ${limits.tpm.unit} (${limits.tpm.usagePercent}%)`);
      console.log(`  ✓ RPM: ${limits.rpm.used}/${limits.rpm.limit} ${limits.rpm.unit} (${limits.rpm.usagePercent}%)`);
      console.log(`  ✓ Timestamp: ${limits.timestamp}`);
    }
  } catch (error) {
    console.log(`  ✗ Failed: ${error}`);
  }
  console.log();

  // Test 2: Check stress
  console.log("Test 2: isAzureOpenAIStressed(80)");
  try {
    const stressed = await isAzureOpenAIStressed(80);
    console.log(`  ${stressed ? "⚠️  Stressed" : "✓ Normal"}`);
  } catch (error) {
    console.log(`  ✗ Failed: ${error}`);
  }
  console.log();

  // Test 3: Get stress report
  console.log("Test 3: getAzureOpenAIStressReport()");
  try {
    const report = await getAzureOpenAIStressReport();
    console.log(`  Report:\n${report.split("\n").map((l) => `    ${l}`).join("\n")}`);
  } catch (error) {
    console.log(`  ✗ Failed: ${error}`);
  }
  console.log();

  console.log("=== Test Complete ===");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
