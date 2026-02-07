/**
 * SSL Configuration Utility for Prisma Scripts
 *
 * Shared SSL configuration for all scripts that need direct database access.
 * Mirrors the logic in src/lib/db.ts for consistency.
 *
 * Plan 074: T2-01 - Centralized SSL configuration
 * ADR 0067: Supabase SSL Configuration
 */

import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export interface SSLConfig {
  rejectUnauthorized: boolean;
  ca?: string;
}

// Minimal logger for CLI scripts (avoids OpenTelemetry dependency)
const log = {
  info: (msg: string) => process.stderr.write(`[SSL] ${msg}\n`),
  warn: (msg: string) => process.stderr.write(`[SSL] WARN: ${msg}\n`),
};

/**
 * Load Supabase certificate chain from file or environment variable.
 * Priority: 1) config/supabase-chain.pem, 2) SUPABASE_CA_CERT env var
 */
export function loadSupabaseCertificate(): string | undefined {
  // Priority 1: Load from repository file
  const certPath = path.join(process.cwd(), "config", "supabase-chain.pem");

  if (fs.existsSync(certPath)) {
    try {
      const cert = fs.readFileSync(certPath, "utf-8");
      const certCount = (cert.match(/BEGIN CERTIFICATE/g) || []).length;
      log.info(
        `Loaded certificate chain from ${certPath} (${certCount} certs)`,
      );
      return cert;
    } catch (error) {
      log.warn(`Failed to read certificate: ${error}`);
    }
  }

  // Priority 2: Environment variable fallback
  const envCert = process.env.SUPABASE_CA_CERT;
  if (envCert) {
    log.info("Using certificate from SUPABASE_CA_CERT");
    return envCert.split("|").join("\n");
  }

  return undefined;
}

/**
 * Check if a database URL points to localhost (no SSL needed)
 */
function isLocalDatabase(url?: string): boolean {
  if (!url) return true; // Default to local if not specified
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    );
  } catch {
    return false;
  }
}

/**
 * Build SSL configuration based on environment.
 * - Production with remote DB: Full SSL with certificate chain
 * - Development or local DB: No SSL
 */
export function buildSSLConfig(): SSLConfig | undefined {
  const dbUrl = process.env.DATABASE_URL;
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  // Never use SSL for local databases (localhost, 127.0.0.1, etc.)
  // This allows running production builds locally for testing
  if (isLocalDatabase(dbUrl)) {
    return undefined;
  }

  if (!isProduction) {
    return undefined;
  }

  const cert = loadSupabaseCertificate();

  if (cert) {
    const certCount = (cert.match(/BEGIN CERTIFICATE/g) || []).length;
    if (certCount >= 2) {
      log.info(`Certificate chain valid (${certCount} certs)`);
      // With the full CA chain provided via `ca`, Node.js validates against it
      // even though Supabase's CA is not in the system trust store.
      // Matches runtime behavior in src/lib/db/ssl-config.ts.
      return { rejectUnauthorized: true, ca: cert };
    }
    log.warn(`Incomplete chain (${certCount} certs), expected >=2`);
  }

  // Fallback: TLS without certificate verification
  log.warn("No valid certificate, using TLS without verification");
  return { rejectUnauthorized: false };
}

/**
 * Remove sslmode parameter from connection string.
 * We manage SSL explicitly via ssl option to avoid conflicts.
 */
function cleanConnectionString(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    // Fallback for malformed URLs: use regex
    let cleaned = url.replace(/([?&])sslmode=[^&]*/g, "$1");
    cleaned = cleaned.replace(/\?&/g, "?");
    cleaned = cleaned.replace(/&&/g, "&");
    cleaned = cleaned.replace(/[?&]$/, "");
    return cleaned;
  }
}

/**
 * Create a configured pg Pool with SSL settings.
 */
export function createPool(connectionString?: string): Pool {
  const rawConnStr =
    connectionString ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/mirrorbuddy";

  // Remove sslmode from connection string - we manage SSL explicitly
  const connStr = cleanConnectionString(rawConnStr);

  return new Pool({
    connectionString: connStr,
    ssl: buildSSLConfig(),
  });
}

/**
 * Create a Prisma client with PG adapter and SSL configuration.
 * Use this in all scripts that need direct database access.
 */
export function createPrismaClient(connectionString?: string): PrismaClient {
  const pool = createPool(connectionString);
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
