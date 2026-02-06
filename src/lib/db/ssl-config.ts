/**
 * SSL Configuration for PostgreSQL Connection
 * ADR 0067: Supabase Certificate Chain Management
 *
 * Configures SSL/TLS for PostgreSQL connections with Supabase certificate chain.
 * Contains both Supabase Intermediate 2021 CA + Supabase Root 2021 CA.
 */

import "server-only";
import fs from "fs";
import path from "path";
import type { PoolConfig } from "pg";
import { logger } from "@/lib/logger";

/**
 * Load Supabase certificate chain from repository or environment
 * Priority 1: Repository file (config/supabase-chain.pem)
 * Priority 2: Environment variable (SUPABASE_CA_CERT)
 */
export function loadSupabaseCertificate(): string | undefined {
  // Priority 1: Load full certificate chain from repository
  // Contains Supabase Intermediate 2021 CA + Supabase Root 2021 CA
  // Both certificates are required for successful verification
  const certPath = path.join(process.cwd(), "config", "supabase-chain.pem");

  if (fs.existsSync(certPath)) {
    try {
      const cert = fs.readFileSync(certPath, "utf-8");
      const certCount = (cert.match(/BEGIN CERTIFICATE/g) || []).length;
      logger.info("[SSL] Loaded certificate chain from repository", {
        path: certPath,
        certificates: certCount,
        size: cert.length,
      });
      return cert;
    } catch (error) {
      logger.warn("[SSL] Failed to read certificate file", {
        path: certPath,
        error: String(error),
      });
    }
  }

  // Priority 2: Fallback to environment variable (for backwards compatibility)
  const envCert = process.env.SUPABASE_CA_CERT;
  if (envCert) {
    logger.info("[SSL] Using certificate from environment variable");
    // Certificate in env var uses '|' as newline separator
    return envCert.split("|").join("\n");
  }

  logger.warn("[SSL] No certificate found in repository or environment");
  return undefined;
}

/**
 * Check if the database URL points to a local database (no SSL needed)
 */
export function isLocalDatabase(url?: string): boolean {
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
 * Build SSL configuration for PostgreSQL connection pool
 * Handles E2E tests, local databases, and production with Supabase
 */
export function buildSslConfig(
  connectionString: string,
  isE2E: boolean,
  isProduction: boolean,
  supabaseCaCert?: string,
): PoolConfig["ssl"] {
  // E2E Tests: NO SSL (local PostgreSQL in CI doesn't support SSL)
  if (isE2E) {
    return undefined;
  }

  // Local databases: NO SSL (localhost, 127.0.0.1, etc.)
  // This allows running production builds locally for testing
  if (isLocalDatabase(connectionString)) {
    return undefined;
  }

  // Production with remote DB: SSL configuration with Supabase certificate chain (ADR 0067)
  if (isProduction) {
    // If certificate chain is available, enable full SSL verification
    if (supabaseCaCert) {
      const certContent =
        typeof supabaseCaCert === "string" ? supabaseCaCert : "";

      // Verify we have the full chain (intermediate + root)
      const certCount = (certContent.match(/BEGIN CERTIFICATE/g) || []).length;

      if (certCount >= 2) {
        logger.info("[SSL] Certificate chain loaded, enabling TLS encryption", {
          certificates: certCount,
          mode: "require",
          adr: "0067",
        });
        // Full certificate chain available (intermediate + root)
        // Enable strict verification with rejectUnauthorized: true
        return {
          rejectUnauthorized: true,
          ca: certContent,
        };
      } else {
        logger.warn("[SSL] Incomplete certificate chain", {
          certificates: certCount,
          expected: ">=2 (intermediate + root)",
          action: "Run: npm run extract-cert to regenerate certificate chain",
        });
      }
    }

    // Fallback: Disable strict SSL verification
    // Connection is still encrypted with TLS, but server certificate is not verified
    logger.warn(
      "[SSL] No certificate chain available, disabling strict verification",
      {
        mode: "require-without-verify",
        security: "TLS encryption active, but server not authenticated",
        action: "Add certificate chain to config/supabase-chain.pem",
        adr: "0067",
      },
    );

    return {
      rejectUnauthorized: false,
    };
  }

  // Local development: no SSL needed (connecting to localhost)
  return undefined;
}

/**
 * Clean connection string by removing sslmode parameter
 * We manage SSL explicitly via ssl option in pool config
 */
export function cleanConnectionString(url: string): string {
  // Remove sslmode=value (and its delimiter)
  let cleaned = url.replace(/([?&])sslmode=[^&]*/g, "$1");
  // Clean up any trailing ? or & or double delimiters
  cleaned = cleaned.replace(/[?&]$/, "").replace(/[?&]{2,}/g, "?");
  return cleaned;
}
