// ============================================================================
// PRISMA CLIENT SINGLETON
// Prevents multiple instances in development with hot reload
// Uses Prisma client with PostgreSQL driver adapter
// ============================================================================

import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, PoolConfig } from "pg";
import { logger } from "@/lib/logger";
import { isSupabaseUrl } from "@/lib/utils/url-validation";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isE2E = process.env.E2E_TESTS === "1";
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const isProduction =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

// CRITICAL SAFETY CHECK: Block Supabase URLs in development/test
// This prevents accidental contamination of production database
// Exception: E2E tests override DATABASE_URL with TEST_DATABASE_URL
if (
  !isProduction &&
  !isE2E &&
  process.env.DATABASE_URL &&
  isSupabaseUrl(process.env.DATABASE_URL)
) {
  throw new Error(
    `❌ SECURITY BLOCK: DATABASE_URL contains production Supabase URL in non-production environment!\n` +
      `NODE_ENV: ${process.env.NODE_ENV}, VERCEL: ${process.env.VERCEL}\n` +
      `To run E2E tests: Set E2E_TESTS=1 and TEST_DATABASE_URL=postgresql://localhost:5432/test\n` +
      `To run dev server: Remove Supabase URL from .env or set NODE_ENV=production\n` +
      `This safety check prevents accidental production database writes during development/testing.`,
  );
}

// DEBUG: Log environment variables when db.ts loads (E2E only)
if (isE2E) {
  logger.info("[db.ts] E2E_TESTS=1, checking environment variables", {
    hasTestDatabaseUrl: !!testDatabaseUrl,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    testDatabaseUrlSet: testDatabaseUrl ? "SET" : "MISSING",
    databaseUrlSet: process.env.DATABASE_URL ? "SET" : "MISSING",
  });
}

const connectionString = isE2E
  ? (() => {
      if (!testDatabaseUrl) {
        throw new Error(
          "TEST_DATABASE_URL must be set when E2E_TESTS=1 to avoid using production data.",
        );
      }
      // CRITICAL: Block production Supabase URLs in E2E tests
      if (isSupabaseUrl(testDatabaseUrl)) {
        throw new Error(
          `❌ BLOCKED: E2E test attempted to use production Supabase database!\n` +
            `TEST_DATABASE_URL must be a local test database, not: ${testDatabaseUrl}\n` +
            `This prevents accidental contamination of production data.`,
        );
      }
      // Validate that connection string has credentials
      if (!testDatabaseUrl.includes("@")) {
        throw new Error(
          `TEST_DATABASE_URL missing credentials (no '@' found): ${testDatabaseUrl}`,
        );
      }
      return testDatabaseUrl;
    })()
  : process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/mirrorbuddy";

// Configure SSL for Supabase connection (ADR 0067)
// ROOT CAUSE SOLUTION: Use full Supabase certificate chain
// Contains: Supabase Intermediate 2021 CA + Supabase Root 2021 CA
// Both certificates are required for proper SSL verification
// Without the full chain, verification fails with "unable to get issuer certificate"

import fs from "fs";
import path from "path";

function loadSupabaseCertificate(): string | undefined {
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

const supabaseCaCert = loadSupabaseCertificate();

// Build SSL configuration
function buildSslConfig(): PoolConfig["ssl"] {
  // E2E Tests: NO SSL (local PostgreSQL in CI doesn't support SSL)
  if (isE2E) {
    return undefined;
  }

  // Production: SSL configuration with Supabase certificate chain (ADR 0067)
  if (isProduction) {
    // If certificate chain is available, enable full SSL verification
    if (supabaseCaCert) {
      const certContent =
        typeof supabaseCaCert === "string" ? supabaseCaCert : "";

      // Verify we have the full chain (intermediate + root)
      const certCount = (certContent.match(/BEGIN CERTIFICATE/g) || []).length;

      if (certCount >= 2) {
        logger.info(
          "[SSL] Certificate chain loaded, enabling SSL verification",
          {
            certificates: certCount,
            mode: "verify-full",
            adr: "0067",
          },
        );
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

// Create pg Pool with SSL configuration
// Remove sslmode parameter from connection string - we manage SSL explicitly via ssl option
function cleanConnectionString(url: string): string {
  // Remove sslmode=value (and its delimiter)
  let cleaned = url.replace(/([?&])sslmode=[^&]*/g, "$1");
  // Clean up any trailing ? or & or double delimiters
  cleaned = cleaned.replace(/[?&]$/, "").replace(/[?&]{2,}/g, "?");
  return cleaned;
}

// Connection pool configuration optimized for Vercel serverless (ADR 0065)
// Serverless functions are stateless and short-lived, so we minimize idle connections
const pool = new Pool({
  connectionString: cleanConnectionString(connectionString),
  ssl: buildSslConfig(),
  max: 5, // Maximum 5 concurrent connections per serverless instance
  min: 0, // No idle connections (serverless cold start every time)
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Timeout after 10 seconds if unable to connect
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Export pool for monitoring/metrics (ADR 0067)
// Allows observability layer to track connection pool statistics
export { pool as dbPool };

/**
 * Check if an error is due to missing database tables (not initialized)
 */
export function isDatabaseNotInitialized(error: unknown): boolean {
  const message = String(error);
  return (
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("P2021")
  ); // Prisma error code for missing table
}

/**
 * Get a user-friendly error message for database errors
 */
export function getDatabaseErrorMessage(error: unknown): string {
  if (isDatabaseNotInitialized(error)) {
    return "Database not initialized. Run: npx prisma migrate deploy";
  }
  return "Database error";
}

export default prisma;
