/**
 * Data Migration: Encrypt Existing Plaintext PII
 *
 * Encrypts plaintext PII in User.email, Profile.name, and GoogleAccount.email
 * using AES-256-GCM encryption. Computes emailHash for indexed lookups.
 *
 * Usage:
 *   npx tsx scripts/migrate-encrypt-pii.ts          # DRY RUN (default)
 *   npx tsx scripts/migrate-encrypt-pii.ts --execute # LIVE RUN
 *
 * Part of Plan 124: Security & Encryption Hardening
 */

import { PrismaClient } from "@prisma/client";
import {
  encryptPII,
  hashPII,
  isPIIEncryptionConfigured,
} from "../src/lib/security/pii-encryption";

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

interface EntityStats {
  total: number;
  encrypted: number;
  skipped: number;
  errors: number;
}

interface MigrationConfig {
  entityName: string;
  fetchRecords: () => Promise<Array<{ id: string; [key: string]: unknown }>>;
  encryptFields: (
    record: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  updateRecord: (id: string, data: Record<string, unknown>) => Promise<unknown>;
}

function isEncrypted(value: string | null): boolean {
  return value !== null && value.startsWith("pii:v1:");
}

async function migrateEntity(
  config: MigrationConfig,
  dryRun: boolean,
): Promise<EntityStats> {
  const stats: EntityStats = { total: 0, encrypted: 0, skipped: 0, errors: 0 };

  console.log("\n" + "=".repeat(60));
  console.log(`Migrating ${config.entityName}`);
  console.log("=".repeat(60));

  const records = await config.fetchRecords();
  stats.total = records.length;
  console.log(`Found ${stats.total} records.\n`);

  if (stats.total === 0) return stats;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(records.length / BATCH_SIZE);

    console.log(`Processing batch ${batchNum}/${totalBatches}...`);

    const updates = [];

    for (const record of batch) {
      try {
        const encryptedData = await config.encryptFields(record);

        if (encryptedData.skip) {
          console.log(`  [SKIP] ${record.id} - already encrypted`);
          stats.skipped++;
          continue;
        }

        if (!dryRun) {
          updates.push(config.updateRecord(record.id, encryptedData));
        }

        console.log(`  [OK] ${record.id} - encrypted`);
        stats.encrypted++;
      } catch (error) {
        console.error(
          `  [ERROR] ${record.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        stats.errors++;
      }
    }

    if (!dryRun && updates.length > 0) {
      await prisma.$transaction(updates);
    }
  }

  return stats;
}

const USER_CONFIG: MigrationConfig = {
  entityName: "User.email",
  fetchRecords: () =>
    prisma.user.findMany({
      where: { email: { not: null } },
      select: { id: true, email: true },
    }),
  encryptFields: async (record) => {
    if (isEncrypted(record.email as string | null)) {
      return { skip: true };
    }
    return {
      email: await encryptPII(record.email as string),
      emailHash: await hashPII(record.email as string),
    };
  },
  updateRecord: (id, data) =>
    prisma.user.update({
      where: { id },
      data: {
        email: data.email as string,
        emailHash: data.emailHash as string,
      },
    }),
};

const PROFILE_CONFIG: MigrationConfig = {
  entityName: "Profile.name",
  fetchRecords: () =>
    prisma.profile.findMany({
      where: { name: { not: null } },
      select: { id: true, name: true },
    }),
  encryptFields: async (record) => {
    if (isEncrypted(record.name as string | null)) {
      return { skip: true };
    }
    return { name: await encryptPII(record.name as string) };
  },
  updateRecord: (id, data) =>
    prisma.profile.update({
      where: { id },
      data: { name: data.name as string },
    }),
};

const GOOGLE_ACCOUNT_CONFIG: MigrationConfig = {
  entityName: "GoogleAccount.email",
  fetchRecords: () =>
    prisma.googleAccount.findMany({
      select: { id: true, email: true },
    }),
  encryptFields: async (record) => {
    if (isEncrypted(record.email as string | null)) {
      return { skip: true };
    }
    return {
      email: await encryptPII(record.email as string),
      emailHash: await hashPII(record.email as string),
    };
  },
  updateRecord: (id, data) =>
    prisma.googleAccount.update({
      where: { id },
      data: {
        email: data.email as string,
        emailHash: data.emailHash as string,
      },
    }),
};

const COPPA_CONSENT_CONFIG: MigrationConfig = {
  entityName: "CoppaConsent.parentEmail",
  fetchRecords: () =>
    prisma.coppaConsent.findMany({
      where: { parentEmail: { not: null } },
      select: { id: true, parentEmail: true },
    }),
  encryptFields: async (record) => {
    if (isEncrypted(record.parentEmail as string | null)) {
      return { skip: true };
    }
    return { parentEmail: await encryptPII(record.parentEmail as string) };
  },
  updateRecord: (id, data) =>
    prisma.coppaConsent.update({
      where: { id },
      data: { parentEmail: data.parentEmail as string },
    }),
};

function printStats(name: string, stats: EntityStats) {
  console.log(`\n${name}:`);
  console.log(`  Total:     ${stats.total}`);
  console.log(`  Encrypted: ${stats.encrypted}`);
  console.log(`  Skipped:   ${stats.skipped}`);
  console.log(`  Errors:    ${stats.errors}`);
}

async function main() {
  const dryRun = !process.argv.includes("--execute");

  console.log("=".repeat(60));
  console.log("PII Encryption Migration");
  console.log("=".repeat(60));
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE RUN"}`);
  console.log("=".repeat(60));

  if (!isPIIEncryptionConfigured()) {
    console.error(
      "\n[ERROR] PII_ENCRYPTION_KEY or ENCRYPTION_KEY not configured!",
    );
    console.error(
      "Please set PII_ENCRYPTION_KEY in your environment before running.",
    );
    process.exit(1);
  }

  console.log("\n[OK] Encryption key configured\n");

  try {
    const userStats = await migrateEntity(USER_CONFIG, dryRun);
    const profileStats = await migrateEntity(PROFILE_CONFIG, dryRun);
    const googleStats = await migrateEntity(GOOGLE_ACCOUNT_CONFIG, dryRun);
    const coppaStats = await migrateEntity(COPPA_CONSENT_CONFIG, dryRun);

    console.log("\n" + "=".repeat(60));
    console.log("Migration Summary");
    console.log("=".repeat(60));

    printStats("Users", userStats);
    printStats("Profiles", profileStats);
    printStats("GoogleAccounts", googleStats);
    printStats("CoppaConsents", coppaStats);

    const totalErrors =
      userStats.errors +
      profileStats.errors +
      googleStats.errors +
      coppaStats.errors;
    const totalEncrypted =
      userStats.encrypted +
      profileStats.encrypted +
      googleStats.encrypted +
      coppaStats.encrypted;

    console.log("\nTotals:");
    console.log(`  Encrypted: ${totalEncrypted}`);
    console.log(`  Errors:    ${totalErrors}`);
    console.log();

    if (dryRun) {
      console.log(
        "[DRY RUN] No changes were made. Run with --execute to apply.",
      );
    } else if (totalErrors > 0) {
      console.log(
        "[WARNING] Migration completed with errors. Check logs above.",
      );
      process.exit(1);
    } else {
      console.log("[SUCCESS] Migration completed successfully!");
    }
  } catch (error) {
    console.error("\n[FATAL] Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
