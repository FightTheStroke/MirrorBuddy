#!/usr/bin/env npx tsx
/**
 * Backup Encryption Verification Script
 * Verifies encryption keys, functionality, rotation helpers, and Supabase backups.
 * Usage: npx tsx scripts/verify-backup-encryption.ts [--dry-run]
 * Exit: 0=pass, 1=fail
 */

import {
  encryptPII,
  decryptPII,
  isPIIEncryptionConfigured,
} from "../src/lib/security/pii-encryption";
import {
  encryptToken,
  decryptToken,
  isEncryptionConfigured,
} from "../src/lib/security/encryption";
import {
  encryptPIIWithKey,
  decryptPIIWithKey,
  encryptTokenWithKey,
  decryptTokenWithKey,
} from "../src/lib/security/key-rotation-helpers";

interface CheckResult {
  name: string;
  status: "PASS" | "FAIL";
  message: string;
}

const results: CheckResult[] = [];
const isDryRun = process.argv.includes("--dry-run");

function addResult(name: string, status: "PASS" | "FAIL", message: string) {
  results.push({ name, status, message });
}

async function testEncryption<T>(
  name: string,
  encryptFn: (val: string) => Promise<T>,
  decryptFn: (val: T) => Promise<string>,
  testValue: string,
): Promise<void> {
  try {
    const encrypted = await encryptFn(testValue);
    const decrypted = await decryptFn(encrypted);
    const passed = decrypted === testValue;
    addResult(
      name,
      passed ? "PASS" : "FAIL",
      passed
        ? "Successfully encrypted and decrypted"
        : `Mismatch: got "${decrypted}", expected "${testValue}"`,
    );
  } catch (error) {
    addResult(
      name,
      "FAIL",
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function checkEncryptionKeyAvailability(): Promise<void> {
  console.log("\n[1/4] Checking encryption key availability...");

  const piiKey = process.env.PII_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  const tokenKey = process.env.TOKEN_ENCRYPTION_KEY;

  addResult(
    "PII Encryption Key",
    piiKey && piiKey.length >= 32 ? "PASS" : "FAIL",
    piiKey && piiKey.length >= 32
      ? `Key available (${piiKey.length} chars)`
      : "PII_ENCRYPTION_KEY or ENCRYPTION_KEY not set or too short (min 32)",
  );

  addResult(
    "Token Encryption Key",
    tokenKey && tokenKey.length >= 32 ? "PASS" : "FAIL",
    tokenKey && tokenKey.length >= 32
      ? `Key available (${tokenKey.length} chars)`
      : "TOKEN_ENCRYPTION_KEY not set or too short (min 32)",
  );

  const piiConfigured = isPIIEncryptionConfigured();
  const tokenConfigured = isEncryptionConfigured();
  addResult(
    "Encryption Configuration",
    piiConfigured && tokenConfigured ? "PASS" : "FAIL",
    `PII: ${piiConfigured}, Token: ${tokenConfigured}`,
  );
}

async function checkEncryptionDecryption(): Promise<void> {
  console.log("\n[2/4] Checking encryption/decryption functionality...");
  const testValue = "test-data-for-verification";
  await testEncryption(
    "PII Encrypt/Decrypt",
    encryptPII,
    decryptPII,
    testValue,
  );
  await testEncryption(
    "Token Encrypt/Decrypt",
    encryptToken,
    decryptToken,
    testValue,
  );
}

async function checkKeyRotationHelpers(): Promise<void> {
  console.log("\n[3/4] Checking key rotation helpers...");

  const testKey = "test-rotation-key-32-chars-min!";
  const testValue = "test-rotation-data";

  await testEncryption(
    "Key Rotation PII Helpers",
    (val) => encryptPIIWithKey(val, testKey),
    (val) => decryptPIIWithKey(val, testKey),
    testValue,
  );

  await testEncryption(
    "Key Rotation Token Helpers",
    (val) => encryptTokenWithKey(val, testKey),
    (val) => decryptTokenWithKey(val, testKey),
    testValue,
  );
}

async function checkSupabaseBackupSettings(): Promise<void> {
  console.log("\n[4/4] Checking Supabase backup settings...");

  if (isDryRun) {
    addResult(
      "Supabase Backup Settings",
      "PASS",
      "Dry run - skipping API call",
    );
    return;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const projectRef =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1];

  if (!serviceKey) {
    addResult(
      "Supabase API Availability",
      "PASS",
      "SUPABASE_SERVICE_KEY not available (optional)",
    );
    return;
  }

  if (!projectRef) {
    addResult(
      "Supabase Project Reference",
      "FAIL",
      "Could not extract project ref from NEXT_PUBLIC_SUPABASE_URL",
    );
    return;
  }

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/backup`,
      {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      addResult(
        "Supabase Backup Settings",
        "PASS",
        `Backup accessible: ${JSON.stringify(data).substring(0, 80)}...`,
      );
    } else {
      addResult(
        "Supabase Backup Settings",
        "FAIL",
        `API ${response.status}: ${await response.text()}`,
      );
    }
  } catch (error) {
    addResult(
      "Supabase Backup Settings",
      "FAIL",
      `API failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function main() {
  console.log("=== Backup Encryption Verification ===");
  if (isDryRun) console.log("\n[DRY RUN MODE]\n");

  await checkEncryptionKeyAvailability();
  await checkEncryptionDecryption();
  await checkKeyRotationHelpers();
  await checkSupabaseBackupSettings();

  console.log("\n=== Results Summary ===\n");

  let hasFailures = false;
  for (const result of results) {
    const icon = result.status === "PASS" ? "✓" : "✗";
    const color = result.status === "PASS" ? "\x1b[32m" : "\x1b[31m";
    console.log(`${color}${icon} ${result.name}: ${result.status}\x1b[0m`);
    console.log(`  ${result.message}`);
    if (result.status === "FAIL") hasFailures = true;
  }

  console.log();
  if (hasFailures) {
    console.error("❌ One or more checks failed");
    process.exit(1);
  }
  console.log("✅ All checks passed");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
