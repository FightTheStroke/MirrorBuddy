/**
 * Vercel Env Sync Alignment Test
 *
 * Ensures that .env, pre-push-vercel.sh, and validate-pre-deploy.ts
 * all agree on which environment variables are required for production.
 *
 * If this test fails, you added a variable to .env without updating
 * the deployment validation scripts.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../..");

/** Variables that are dev/test/iOS-only and should NOT be on Vercel */
const DEV_ONLY_VARS = new Set([
  "DEV_DATABASE_URL",
  "TEST_DATABASE_URL",
  "TEST_DIRECT_URL",
  "OLLAMA_URL",
  "OLLAMA_MODEL",
  "NODE_TLS_REJECT_UNAUTHORIZED",
  "VERCEL_TOKEN",
  "APPLE_ID",
  "TEAM_ID",
  "ITC_TEAM_ID",
  "FASTLANE_USER",
  "MATCH_GIT_URL",
  "MATCH_PASSWORD",
]);

/** Variables that may be empty in .env but are still valid */
const ALLOW_EMPTY = new Set(["BRAVE_SEARCH_API_KEY"]);

function parseEnvVarNames(filePath: string): string[] {
  const content = readFileSync(resolve(ROOT, filePath), "utf-8");
  return content
    .split("\n")
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => line.split("=")[0])
    .filter((name) => !DEV_ONLY_VARS.has(name));
}

function parseRequiredVarsFromBash(filePath: string): string[] {
  const content = readFileSync(resolve(ROOT, filePath), "utf-8");
  // Extract vars between REQUIRED_VARS=( and the closing )
  const blockMatch = content.match(/REQUIRED_VARS=\(([\s\S]*?)\)/);
  if (!blockMatch) return [];
  const blockMatches = blockMatch[1].match(/"([A-Z_]+)"/g) || [];
  return blockMatches.map((m) => m.replace(/"/g, ""));
}

function parseCriticalVarsFromTs(filePath: string): string[] {
  const content = readFileSync(resolve(ROOT, filePath), "utf-8");
  const criticalBlock = content.match(/const critical = \[([\s\S]*?)\];/);
  if (!criticalBlock) return [];
  const names = criticalBlock[1].match(/name:\s*"([A-Z_]+)"/g) || [];
  return names.map((m) => m.replace(/name:\s*"|"/g, ""));
}

describe("Vercel environment variable alignment", () => {
  const envVars = parseEnvVarNames(".env");
  const productionVars = envVars.filter((v) => !ALLOW_EMPTY.has(v));

  it("should have production vars in .env", () => {
    expect(productionVars.length).toBeGreaterThan(30);
  });

  it("pre-push-vercel.sh REQUIRED_VARS should cover all .env production vars", () => {
    const requiredVars = new Set(
      parseRequiredVarsFromBash("scripts/pre-push-vercel.sh"),
    );

    const missing = productionVars.filter((v) => !requiredVars.has(v));

    if (missing.length > 0) {
      throw new Error(
        `pre-push-vercel.sh is missing ${missing.length} vars from .env:\n` +
          missing.map((v) => `  - ${v}`).join("\n") +
          "\n\nAdd them to REQUIRED_VARS in scripts/pre-push-vercel.sh",
      );
    }
  });

  it("validate-pre-deploy.ts critical vars should be subset of pre-push vars", () => {
    const criticalVars = parseCriticalVarsFromTs(
      "scripts/validate-pre-deploy.ts",
    );
    const requiredVars = new Set(
      parseRequiredVarsFromBash("scripts/pre-push-vercel.sh"),
    );

    const missing = criticalVars.filter((v) => !requiredVars.has(v));

    if (missing.length > 0) {
      throw new Error(
        `validate-pre-deploy.ts has critical vars not in pre-push:\n` +
          missing.map((v) => `  - ${v}`).join("\n"),
      );
    }
  });

  it("fix-vercel-env-vars.sh SKIP_VARS should match DEV_ONLY_VARS", () => {
    const content = readFileSync(
      resolve(ROOT, "scripts/fix-vercel-env-vars.sh"),
      "utf-8",
    );
    const blockMatch = content.match(/SKIP_VARS=\(([\s\S]*?)\)/);
    if (!blockMatch) {
      throw new Error("Could not find SKIP_VARS in fix-vercel-env-vars.sh");
    }
    const skipMatches = blockMatch[1].match(/"([A-Z_]+)"/g) || [];
    const skipVars = new Set(skipMatches.map((m) => m.replace(/"/g, "")));

    for (const devVar of DEV_ONLY_VARS) {
      expect(skipVars.has(devVar)).toBe(true);
    }

    for (const skipVar of skipVars) {
      expect(DEV_ONLY_VARS.has(skipVar)).toBe(true);
    }
  });
});
