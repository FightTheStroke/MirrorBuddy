/**
 * Key Rotation CLI Script
 *
 * Rotates encryption keys for token, session, and PII data.
 * Re-encrypts existing data with new keys while maintaining data integrity.
 *
 * Usage:
 *   npx tsx scripts/rotate-keys.ts --type=token --old-key=xxx --new-key=yyy
 *   npx tsx scripts/rotate-keys.ts --type=session --old-key=xxx --new-key=yyy
 *   npx tsx scripts/rotate-keys.ts --type=pii --old-key=xxx --new-key=yyy
 *
 * Options:
 *   --type=<type>        Rotation type: token, session, or pii (REQUIRED)
 *   --old-key=<key>      Current encryption key (REQUIRED)
 *   --new-key=<key>      New encryption key (REQUIRED)
 *   --dry-run            Preview changes without updating database
 *   --batch-size=<n>     Number of records to process per batch (default: 100)
 *
 * Examples:
 *   # Dry run to preview changes
 *   npx tsx scripts/rotate-keys.ts --type=pii --old-key=old123 --new-key=new456 --dry-run
 *
 *   # Rotate PII encryption key with custom batch size
 *   npx tsx scripts/rotate-keys.ts --type=pii --old-key=old123 --new-key=new456 --batch-size=50
 *
 * Security:
 *   - Keys are not logged to console (shown as ***)
 *   - Uses transactions for atomicity
 *   - Validates decryption before re-encryption
 *   - Exits on first critical error
 *
 * Plan 124: Security & Encryption Hardening
 */

import "dotenv/config";
import {
  rotateTokenKey,
  rotateSessionKey,
  rotatePIIKey,
} from "../src/lib/security/key-rotation";

/**
 * CLI argument parser
 */
function parseArgs(): {
  type: "token" | "session" | "pii";
  oldKey: string;
  newKey: string;
  dryRun: boolean;
  batchSize: number;
} {
  const args = process.argv.slice(2);

  const type = args.find((arg) => arg.startsWith("--type="))?.split("=")[1] as
    | "token"
    | "session"
    | "pii"
    | undefined;

  const oldKey = args
    .find((arg) => arg.startsWith("--old-key="))
    ?.split("=")[1];
  const newKey = args
    .find((arg) => arg.startsWith("--new-key="))
    ?.split("=")[1];
  const dryRun = args.includes("--dry-run");
  const batchSizeArg = args.find((arg) => arg.startsWith("--batch-size="));
  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split("=")[1]) : 100;

  // Validate required arguments
  if (!type) {
    console.error("ERROR: --type flag is required");
    console.error("Valid types: token, session, pii");
    console.error("Example: --type=pii");
    process.exit(1);
  }

  if (!["token", "session", "pii"].includes(type)) {
    console.error(`ERROR: Invalid type "${type}"`);
    console.error("Valid types: token, session, pii");
    process.exit(1);
  }

  if (!oldKey) {
    console.error("ERROR: --old-key flag is required");
    console.error("Example: --old-key=your-current-key");
    process.exit(1);
  }

  if (!newKey) {
    console.error("ERROR: --new-key flag is required");
    console.error("Example: --new-key=your-new-key");
    process.exit(1);
  }

  // Validate batch size
  if (isNaN(batchSize) || batchSize <= 0) {
    console.error(`ERROR: Invalid batch size "${batchSize}"`);
    console.error("Batch size must be a positive integer");
    process.exit(1);
  }

  return { type, oldKey, newKey, dryRun, batchSize };
}

/**
 * Format key for display (mask sensitive data)
 */
function maskKey(key: string): string {
  if (key.length <= 8) {
    return "***";
  }
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}

/**
 * Main execution function
 */
async function main() {
  console.log(
    "\n╔════════════════════════════════════════════════════════════╗",
  );
  console.log("║              MirrorBuddy Key Rotation Tool                 ║");
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n",
  );

  // Parse and validate arguments
  const { type, oldKey, newKey, dryRun, batchSize } = parseArgs();

  // Log configuration (mask keys for security)
  console.log("Configuration:");
  console.log(`  Type:       ${type}`);
  console.log(`  Old Key:    ${maskKey(oldKey)}`);
  console.log(`  New Key:    ${maskKey(newKey)}`);
  console.log(
    `  Mode:       ${dryRun ? "DRY RUN (no changes)" : "LIVE ROTATION"}`,
  );
  console.log(`  Batch Size: ${batchSize}`);
  console.log("");

  if (dryRun) {
    console.log("⚠️  DRY RUN: No changes will be made to the database");
    console.log("");
  } else {
    console.log("⚠️  LIVE MODE: Database will be updated");
    console.log("");
  }

  // Execute appropriate rotation function
  console.log(`Starting ${type} key rotation...\n`);

  try {
    let result;

    switch (type) {
      case "token":
        result = await rotateTokenKey(oldKey, newKey, {
          dryRun,
          batchSize,
        });
        break;

      case "session":
        result = await rotateSessionKey(oldKey, newKey, {
          dryRun,
          batchSize,
        });
        break;

      case "pii":
        result = await rotatePIIKey(oldKey, newKey, {
          dryRun,
          batchSize,
        });
        break;
    }

    // Log results
    console.log(
      "\n╔════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║                    Rotation Complete                       ║",
    );
    console.log(
      "╚════════════════════════════════════════════════════════════╝\n",
    );

    console.log("Statistics:");
    console.log(`  Records Processed: ${result.recordsProcessed}`);
    console.log(`  Records Updated:   ${result.recordsUpdated}`);
    console.log(`  Records Skipped:   ${result.recordsSkipped}`);
    console.log(`  Errors:            ${result.errors}`);
    console.log("");

    if (result.errors > 0) {
      console.log("⚠️  Some records encountered errors during rotation");
      console.log("   Check logs for details");
      console.log("");
      process.exit(1);
    }

    if (dryRun) {
      console.log(
        "✓ Dry run complete. Run without --dry-run to apply changes.\n",
      );
    } else {
      console.log("✓ Key rotation successful!\n");
    }

    process.exit(0);
  } catch (error) {
    console.error("\n✗ Error during key rotation:");
    console.error(error instanceof Error ? error.message : String(error));
    console.error("");

    if (error instanceof Error && error.stack) {
      console.error("Stack trace:");
      console.error(error.stack);
      console.error("");
    }

    process.exit(1);
  }
}

// Execute with error handling
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
