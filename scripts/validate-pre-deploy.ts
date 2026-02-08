#!/usr/bin/env node
/**
 * Pre-deploy validation script
 * Checks: Sentry DSN format, Vercel token validity, critical environment variables
 * Exit code: 0 (success) | 1 (critical failure) | 2 (warnings only)
 */

import { config } from "dotenv";
import fs from "fs";
import path from "path";

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

  // Validate basic Sentry DSN structure without complex regex
  let hasSentry = false;
  try {
    const hostname = new URL(dsn).hostname;
    hasSentry = hostname === "sentry.io" || hostname.endsWith(".sentry.io");
  } catch {
    // Invalid URL — hasSentry stays false
  }
  const checks = {
    https: dsn.startsWith("https://"),
    hasAt: dsn.includes("@"),
    hasSentry,
    endsWithId: /\/\d+$/.test(dsn),
  };
  const isValid = Object.values(checks).every(Boolean);

  if (isValid) {
    const projectId = dsn.split("/").pop();
    addResult(
      "Sentry",
      "DSN Format",
      "PASS",
      `Valid Sentry DSN (project: ${projectId})`,
      false,
    );
  } else {
    const failing = Object.entries(checks)
      .filter(([, v]) => !v)
      .map(([k]) => k)
      .join(", ");
    addResult(
      "Sentry",
      "DSN Format",
      "WARN",
      `DSN format issue (failing: ${failing}, len: ${dsn.length}) - Sentry may not initialize correctly`,
      false,
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
    // Core
    { name: "DATABASE_URL", sensitive: true },
    { name: "DIRECT_URL", sensitive: true },
    { name: "SESSION_SECRET", sensitive: true },
    { name: "ADMIN_EMAIL", sensitive: false },
    { name: "ADMIN_PASSWORD", sensitive: true },
    { name: "CRON_SECRET", sensitive: true },
    { name: "TOKEN_ENCRYPTION_KEY", sensitive: true },
    { name: "IP_HASH_SALT", sensitive: true },
    // Azure AI
    { name: "AZURE_OPENAI_API_KEY", sensitive: true },
    { name: "AZURE_OPENAI_ENDPOINT", sensitive: false },
    { name: "AZURE_OPENAI_CHAT_DEPLOYMENT", sensitive: false },
    { name: "AZURE_OPENAI_EMBEDDING_DEPLOYMENT", sensitive: false },
    { name: "AZURE_OPENAI_REALTIME_ENDPOINT", sensitive: false },
    { name: "AZURE_OPENAI_REALTIME_API_KEY", sensitive: true },
    { name: "AZURE_OPENAI_REALTIME_DEPLOYMENT", sensitive: false },
    { name: "AZURE_OPENAI_TTS_DEPLOYMENT", sensitive: false },
    // Email
    { name: "RESEND_API_KEY", sensitive: true },
    { name: "FROM_EMAIL", sensitive: false },
    { name: "SUPPORT_EMAIL", sensitive: false },
    // Auth
    { name: "GOOGLE_CLIENT_ID", sensitive: false },
    { name: "GOOGLE_CLIENT_SECRET", sensitive: true },
    { name: "NEXT_PUBLIC_GOOGLE_CLIENT_ID", sensitive: false },
    { name: "NEXTAUTH_URL", sensitive: false },
    // Push notifications
    { name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", sensitive: false },
    { name: "VAPID_PRIVATE_KEY", sensitive: true },
    { name: "VAPID_SUBJECT", sensitive: false },
    // Rate limiting
    { name: "UPSTASH_REDIS_REST_URL", sensitive: false },
    { name: "UPSTASH_REDIS_REST_TOKEN", sensitive: true },
    // Supabase
    { name: "NEXT_PUBLIC_SUPABASE_URL", sensitive: false },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", sensitive: false },
    { name: "SUPABASE_SERVICE_ROLE_KEY", sensitive: true },
    // Misc
    { name: "PROTECTED_USERS", sensitive: false },
    { name: "TRIAL_BUDGET_LIMIT_EUR", sensitive: false },
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
    { name: "SENTRY_AUTH_TOKEN", category: "Sentry" },
    { name: "SENTRY_ORG", category: "Sentry" },
    { name: "SENTRY_PROJECT", category: "Sentry" },
    { name: "GRAFANA_CLOUD_PROMETHEUS_URL", category: "Observability" },
    { name: "GRAFANA_CLOUD_PROMETHEUS_USER", category: "Observability" },
    { name: "GRAFANA_CLOUD_API_KEY", category: "Observability" },
    { name: "GRAFANA_CLOUD_PUSH_INTERVAL", category: "Observability" },
    { name: "LIVEKIT_URL", category: "LiveKit" },
    { name: "LIVEKIT_API_KEY", category: "LiveKit" },
    { name: "LIVEKIT_API_SECRET", category: "LiveKit" },
    { name: "NEXT_PUBLIC_LIVEKIT_URL", category: "LiveKit" },
    { name: "NEXT_PUBLIC_SITE_URL", category: "SEO" },
    { name: "NEXT_PUBLIC_APP_URL", category: "App" },
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

function validateVercelRegionCompliance(): void {
  const vercelConfigPath = path.join(process.cwd(), "vercel.json");
  if (!fs.existsSync(vercelConfigPath)) {
    addResult(
      "Vercel",
      "Region Pinning",
      "FAIL",
      "vercel.json not found - cannot verify EU region pinning",
      true,
    );
    return;
  }

  let parsed: unknown;
  try {
    const raw = fs.readFileSync(vercelConfigPath, "utf8");
    parsed = JSON.parse(raw);
  } catch (error) {
    addResult(
      "Vercel",
      "Region Pinning",
      "FAIL",
      `vercel.json is invalid JSON (${String(error)})`,
      true,
    );
    return;
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("regions" in parsed) ||
    !Array.isArray((parsed as { regions?: unknown[] }).regions)
  ) {
    addResult(
      "Vercel",
      "Region Pinning",
      "FAIL",
      'Missing "regions" in vercel.json (required for EU compute pinning)',
      true,
    );
    return;
  }

  const regions = (parsed as { regions: unknown[] }).regions.filter(
    (value): value is string => typeof value === "string",
  );
  if (regions.length === 0) {
    addResult(
      "Vercel",
      "Region Pinning",
      "FAIL",
      '"regions" is empty in vercel.json',
      true,
    );
    return;
  }

  // EU-only regions accepted for strict compliance posture.
  const euRegions = new Set(["fra1", "cdg1", "arn1", "dub1"]);
  const invalid = regions.filter((region) => !euRegions.has(region));
  if (invalid.length > 0) {
    addResult(
      "Vercel",
      "Region Pinning",
      "FAIL",
      `Non-EU or unsupported region(s) in vercel.json: ${invalid.join(", ")}`,
      true,
    );
    return;
  }

  addResult(
    "Vercel",
    "Region Pinning",
    "PASS",
    `EU regions pinned in vercel.json: ${regions.join(", ")}`,
    false,
  );
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
  validateSentryDSN(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim());

  // Validate Vercel token
  validateVercelToken(process.env.VERCEL_TOKEN?.trim());

  // Validate Vercel region compliance
  validateVercelRegionCompliance();

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
