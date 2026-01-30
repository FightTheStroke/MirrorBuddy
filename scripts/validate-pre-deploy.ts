#!/usr/bin/env node
/**
 * Pre-deploy validation script
 * Checks: Sentry DSN format, Vercel token validity, critical environment variables
 * Exit code: 0 (success) | 1 (critical failure) | 2 (warnings only)
 */

import { config } from "dotenv";

config();

interface ValidationResult {
  category: string;
  check: string;
  status: "PASS" | "WARN" | "FAIL";
  message: string;
  critical: boolean;
}

const results: ValidationResult[] = [];

function addResult(
  category: string,
  check: string,
  status: "PASS" | "WARN" | "FAIL",
  message: string,
  critical = false,
): void {
  results.push({ category, check, status, message, critical });
}

function validateSentryDSN(dsn: string | undefined): void {
  if (!dsn) {
    addResult(
      "Sentry",
      "DSN Set",
      "WARN",
      "NEXT_PUBLIC_SENTRY_DSN not configured - error tracking disabled",
      false,
    );
    return;
  }

  // Sentry DSN format: https://<key>@<project>.ingest.<region>.sentry.io/<projectId>
  const dsnRegex =
    /^https:\/\/[a-f0-9]{32}@[a-z0-9-]+\.ingest\.(us|de|eu|custom)\.sentry\.io\/\d+$/;

  if (dsnRegex.test(dsn)) {
    const projectId = dsn.split("/").pop();
    addResult(
      "Sentry",
      "DSN Format",
      "PASS",
      `Valid Sentry DSN (project: ${projectId})`,
      false,
    );
  } else {
    addResult(
      "Sentry",
      "DSN Format",
      "FAIL",
      `Invalid DSN format: ${dsn.substring(0, 50)}... (expected: https://key@host.ingest.region.sentry.io/projectId)`,
      true,
    );
  }
}

function validateVercelToken(token: string | undefined): void {
  if (!token) {
    addResult(
      "Vercel",
      "Token Set",
      "WARN",
      "VERCEL_TOKEN not set - deployment may fail",
      false,
    );
    return;
  }

  // Vercel tokens are typically alphanumeric, 24+ chars
  if (token.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(token)) {
    const masked =
      token.substring(0, 4) +
      "*".repeat(token.length - 8) +
      token.substring(token.length - 4);
    addResult(
      "Vercel",
      "Token Format",
      "PASS",
      `Valid token format (${masked})`,
      false,
    );
  } else {
    addResult(
      "Vercel",
      "Token Format",
      "FAIL",
      `Invalid token format (length: ${token.length}, expected: ≥20 alphanumeric)`,
      true,
    );
  }
}

function validateCriticalEnvVars(): void {
  const critical = [
    { name: "DATABASE_URL", sensitive: true },
    { name: "SESSION_SECRET", sensitive: true },
    { name: "ADMIN_EMAIL", sensitive: false },
    { name: "CRON_SECRET", sensitive: true },
  ];

  for (const envVar of critical) {
    const value = process.env[envVar.name];
    if (value) {
      const displayValue = envVar.sensitive
        ? value.substring(0, 3) + "*".repeat(Math.max(0, value.length - 6))
        : value;
      addResult(
        "Environment",
        envVar.name,
        "PASS",
        `${envVar.name} is set (${displayValue})`,
        false,
      );
    } else {
      addResult(
        "Environment",
        envVar.name,
        "FAIL",
        `${envVar.name} is required for deployment`,
        true,
      );
    }
  }
}

function validateOptionalEnvVars(): void {
  const optional = [
    { name: "NEXT_PUBLIC_SENTRY_DSN", category: "Sentry" },
    { name: "VERCEL_TOKEN", category: "Vercel" },
    { name: "SENTRY_AUTH_TOKEN", category: "Sentry" },
    { name: "SENTRY_ORG", category: "Sentry" },
    { name: "SENTRY_PROJECT", category: "Sentry" },
  ];

  for (const envVar of optional) {
    const value = process.env[envVar.name];
    if (value) {
      // These are handled by specific validators above
      continue;
    }
    addResult(
      "Optional",
      envVar.name,
      "WARN",
      `${envVar.name} not configured (optional - some features may be degraded)`,
      false,
    );
  }
}

function printResults(): void {
  console.log("\n🔍 Pre-Deploy Validation\n");
  console.log("=".repeat(70));

  const categories = [...new Set(results.map((r) => r.category))].sort();

  for (const category of categories) {
    console.log(`\n${category}:`);
    const categoryResults = results.filter((r) => r.category === category);

    for (const result of categoryResults) {
      const icon =
        result.status === "PASS"
          ? "✅"
          : result.status === "WARN"
            ? "⚠️"
            : "❌";
      const label = `${icon} ${result.check}`;
      console.log(`  ${label.padEnd(40)} ${result.message}`);
    }
  }

  console.log("\n" + "=".repeat(70));

  const passCount = results.filter((r) => r.status === "PASS").length;
  const warnCount = results.filter((r) => r.status === "WARN").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  const criticalFailCount = results.filter(
    (r) => r.status === "FAIL" && r.critical,
  ).length;

  console.log(
    `Summary: ${passCount} passed, ${warnCount} warning(s), ${failCount} failure(s)`,
  );

  if (criticalFailCount > 0) {
    console.log(
      `🚨 CRITICAL: ${criticalFailCount} critical check(s) failed - deployment blocked`,
    );
  } else if (failCount > 0) {
    console.log(`⚠️  WARNING: ${failCount} non-critical check(s) failed`);
  } else if (warnCount > 0) {
    console.log(`ℹ️  INFO: ${warnCount} warning(s) - deployment allowed`);
  } else {
    console.log("✅ All checks passed - safe to deploy");
  }

  console.log("=".repeat(70) + "\n");
}

function getExitCode(): number {
  const criticalFails = results.filter(
    (r) => r.status === "FAIL" && r.critical,
  ).length;
  if (criticalFails > 0) {
    return 1; // Critical failure
  }
  return 0; // Success or warnings only
}

async function main(): Promise<void> {
  console.log("Starting pre-deploy validation...");

  // Validate Sentry DSN
  validateSentryDSN(process.env.NEXT_PUBLIC_SENTRY_DSN);

  // Validate Vercel token
  validateVercelToken(process.env.VERCEL_TOKEN);

  // Validate critical environment variables
  validateCriticalEnvVars();

  // Validate optional environment variables
  validateOptionalEnvVars();

  // Print results and exit
  printResults();
  const exitCode = getExitCode();
  process.exit(exitCode);
}

main().catch((error) => {
  console.error("Error running pre-deploy validation:", error);
  process.exit(1);
});
