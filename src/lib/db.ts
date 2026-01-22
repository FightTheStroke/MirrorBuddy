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
if (
  !isProduction &&
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

// Configure SSL for Supabase connection
// Supabase uses a CA certificate that must be explicitly trusted
// Download from: Supabase Dashboard → Database Settings → SSL Configuration
const supabaseCaCert = process.env.SUPABASE_CA_CERT;

// Build SSL configuration
function buildSslConfig(): PoolConfig["ssl"] {
  // E2E Tests: NO SSL (local PostgreSQL in CI doesn't support SSL)
  if (isE2E) {
    return undefined;
  }

  // Production: TEMPORARY - Disable SSL verification
  // TODO: Get full certificate chain (root + intermediate) from Supabase
  // The intermediate cert in SUPABASE_CA_CERT is incomplete - missing root CA
  // Vercel serverless doesn't have Supabase root CA in system trust store
  if (isProduction) {
    logger.warn("[TEMP] SSL verification disabled - need full cert chain", {
      issue: "missing_root_ca_in_vercel_trust_store",
      action: "Get root + intermediate certs from Supabase",
    });
    return {
      rejectUnauthorized: false,
    };
  }

  // Local development: no SSL needed (connecting to localhost)
  return undefined;
}

// Create pg Pool with SSL configuration
// Remove any sslmode parameter from connection string - we manage SSL explicitly via ssl option
const cleanConnectionString = connectionString.replace(
  /[?&]sslmode=[^&]*/g,
  "",
);

const pool = new Pool({
  connectionString: cleanConnectionString,
  ssl: buildSslConfig(),
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
