#!/usr/bin/env tsx

/**
 * Extract Supabase SSL Certificate
 * Extracts ONLY the intermediate certificate (not root CA)
 * This is the ROOT CAUSE solution for SSL verification
 */

import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable not set");
  process.exit(1);
}

console.log("=== Extracting Supabase SSL Certificate ===\n");

// Remove sslmode from connection string to avoid conflicts
const cleanUrl = DATABASE_URL.replace(/([?&])sslmode=[^&]*/g, "$1").replace(
  /[?&]$/,
  "",
);

async function extractCertificate() {
  let socket: unknown = null;
  const client = new Client({
    connectionString: cleanUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  // Hook into the connection to capture the TLS socket
  client.on("connect", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket = (client as any).connection?.stream;
  });

  try {
    await client.connect();
    console.log("✓ Connected to Supabase");

    // Get certificate details from the established connection
    if (socket && typeof socket.getPeerCertificate === "function") {
      const cert = socket.getPeerCertificate(true);
      if (cert && Object.keys(cert).length > 0) {
        console.log("\nServer Certificate:");
        console.log(`  Subject: ${cert.subject.CN}`);
        console.log(
          `  Issuer: ${cert.issuerCertificate?.subject?.CN || "unknown"}`,
        );

        // We need the FULL certificate chain (intermediate + root)
        // The intermediate is in cert.issuerCertificate
        if (cert.issuerCertificate && cert.issuerCertificate !== cert) {
          const intermediate = cert.issuerCertificate;
          console.log("\nIntermediate Certificate:");
          console.log(`  Subject: ${intermediate.subject.CN}`);
          console.log(
            `  Issuer: ${intermediate.issuerCertificate?.subject?.CN || "unknown"}`,
          );

          // Build the certificate chain: intermediate + root (if available)
          let certChain = "";

          // Add intermediate certificate
          certChain += `-----BEGIN CERTIFICATE-----\n${intermediate.raw
            .toString("base64")
            .match(/.{1,64}/g)
            ?.join("\n")}\n-----END CERTIFICATE-----\n`;

          // Check if there's a root CA
          if (
            intermediate.issuerCertificate &&
            intermediate.issuerCertificate !== intermediate
          ) {
            const root = intermediate.issuerCertificate;
            console.log("\nRoot CA Certificate:");
            console.log(`  Subject: ${root.subject.CN}`);
            console.log(`  Issuer: ${root.issuer.CN}`);

            const isSelfSigned =
              JSON.stringify(root.subject) === JSON.stringify(root.issuer);
            console.log(`  Self-signed: ${isSelfSigned}`);

            // Add root certificate
            certChain += `-----BEGIN CERTIFICATE-----\n${root.raw
              .toString("base64")
              .match(/.{1,64}/g)
              ?.join("\n")}\n-----END CERTIFICATE-----\n`;

            console.log(
              "\n✓ Full certificate chain extracted (intermediate + root)",
            );
          } else {
            console.log("\n⚠️  No root CA found, using intermediate only");
          }

          // Save to file
          const outputPath = path.join(
            process.cwd(),
            "config",
            "supabase-chain.pem",
          );
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, certChain, "utf-8");

          const certCount = (certChain.match(/BEGIN CERTIFICATE/g) || [])
            .length;
          console.log(`\n✓ Certificate chain saved to: ${outputPath}`);
          console.log(`  Certificates in chain: ${certCount}`);
          console.log("\nNext steps:");
          console.log(
            "  1. Update src/lib/db.ts to load from config/supabase-chain.pem",
          );
          console.log("  2. Test locally: npm run dev");
          console.log("  3. Commit and deploy to Vercel");
          console.log("\n✅ Root cause solution complete!");
        } else {
          console.log("⚠️  No certificate chain found");
        }
      } else {
        console.log("⚠️  No certificate details available");
      }
    } else {
      console.log("⚠️  Unable to access TLS socket");
    }

    await client.end();
  } catch (err) {
    const error = err as Error;
    console.error(`✗ Connection failed: ${error.message}`);
    await client.end();
    process.exit(1);
  }
}

extractCertificate().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
