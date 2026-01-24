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
 * Build SSL configuration based on environment.
 * - Production: Full SSL with certificate chain
 * - Development: No SSL (localhost)
 */
export function buildSSLConfig(): SSLConfig | undefined {
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  if (!isProduction) {
    return undefined;
  }

  const cert = loadSupabaseCertificate();

  if (cert) {
    const certCount = (cert.match(/BEGIN CERTIFICATE/g) || []).length;
    if (certCount >= 2) {
      log.info(`Certificate chain valid (${certCount} certs)`);
      return { rejectUnauthorized: true, ca: cert };
    }
    log.warn(`Incomplete chain (${certCount} certs), expected >=2`);
  }

  // Fallback: TLS without certificate verification
  log.warn("No valid certificate, using TLS without verification");
  return { rejectUnauthorized: false };
}

/**
 * Create a configured pg Pool with SSL settings.
 */
export function createPool(connectionString?: string): Pool {
  const connStr =
    connectionString ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/mirrorbuddy";

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
