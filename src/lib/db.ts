// ============================================================================
// PRISMA CLIENT SINGLETON
// Prevents multiple instances in development with hot reload
// Uses Prisma client with PostgreSQL driver adapter
// ============================================================================

import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, PoolConfig } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isE2E = process.env.E2E_TESTS === "1";
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const connectionString = isE2E
  ? (() => {
      if (!testDatabaseUrl) {
        throw new Error(
          "TEST_DATABASE_URL must be set when E2E_TESTS=1 to avoid using production data.",
        );
      }
      return testDatabaseUrl;
    })()
  : process.env.DATABASE_URL || "postgresql://localhost:5432/mirrorbuddy";

// Configure SSL for Supabase connection
// Supabase uses a CA certificate that must be explicitly trusted
// Download from: Supabase Dashboard → Database Settings → SSL Configuration
const supabaseCaCert = process.env.SUPABASE_CA_CERT;
const isProduction =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

// Build SSL configuration
function buildSslConfig(): PoolConfig["ssl"] {
  // REQUIRED for Supabase: The pooler uses a CA not in Node's default trust store
  // Without the CA cert, SSL verification will fail with "self-signed certificate"
  if (supabaseCaCert) {
    // SECURE: Full certificate verification with Supabase CA
    return {
      rejectUnauthorized: true,
      ca: supabaseCaCert,
    };
  }

  // Production without CA cert: encrypt only, skip verification
  // This is required because Supabase's CA isn't in Node.js trust store
  // To enable full verification: set SUPABASE_CA_CERT env variable
  if (isProduction) {
    return {
      rejectUnauthorized: false,
    };
  }

  // Local development: no SSL needed (connecting to localhost)
  return undefined;
}

// Create pg Pool with SSL configuration
const pool = new Pool({
  connectionString,
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
