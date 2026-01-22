#!/usr/bin/env tsx

/**
 * Test Final SSL Solution
 * Verifies that the Supabase intermediate certificate works correctly
 */

import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable not set");
  process.exit(1);
}

console.log("=== Testing Final SSL Solution ===\n");

// Remove sslmode from connection string
const cleanUrl = DATABASE_URL.replace(/([?&])sslmode=[^&]*/g, "$1").replace(
  /[?&]$/,
  "",
);

// Load the full certificate chain (intermediate + root)
const certPath = path.join(process.cwd(), "config", "supabase-chain.pem");

if (!fs.existsSync(certPath)) {
  console.error(`✗ Certificate not found: ${certPath}`);
  process.exit(1);
}

const cert = fs.readFileSync(certPath, "utf-8");
console.log(`✓ Certificate loaded from: ${certPath}`);
console.log(`  Size: ${cert.length} bytes`);

const certCount = (cert.match(/BEGIN CERTIFICATE/g) || []).length;
console.log(`  Certificates: ${certCount}\n`);

async function testConnection() {
  console.log("--- Test: PostgreSQL Connection with Intermediate CA ---");

  const client = new Client({
    connectionString: cleanUrl,
    ssl: {
      rejectUnauthorized: true, // STRICT verification
      ca: cert, // Use intermediate certificate
    },
  });

  try {
    await client.connect();
    const result = await client.query("SELECT version()");
    console.log("✅ Connection successful with SSL verification enabled!");
    console.log(
      `Database: ${result.rows[0].version.split(" ").slice(0, 2).join(" ")}`,
    );
    await client.end();

    console.log("\n=== SUCCESS ===");
    console.log("Root cause solution verified!");
    console.log(
      "SSL verification is working with Supabase intermediate certificate.",
    );
    console.log("\nReady to:");
    console.log("  1. git add .");
    console.log(
      '  2. git commit -m "fix(ssl): use Supabase intermediate certificate"',
    );
    console.log("  3. git push");
  } catch (err) {
    const error = err as Error;
    console.error(`✗ Connection failed: ${error.message}`);
    console.error("\nThis means the certificate is not correct.");
    console.error("Check that:");
    console.error("  1. Certificate file exists and is readable");
    console.error("  2. Certificate is the INTERMEDIATE cert (not root)");
    console.error("  3. Connection string is correct");
    process.exit(1);
  }
}

testConnection().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
