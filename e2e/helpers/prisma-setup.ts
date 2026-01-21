/**
 * Prisma Client Setup for E2E Test Helpers
 *
 * Provides singleton Prisma client with SSL configuration for Supabase support (ADR 0063).
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

let prisma: PrismaClient | null = null;

/**
 * Create a Prisma client with SSL configuration for test database
 */
function createTestPrismaClient(): PrismaClient {
  const connectionString =
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/mirrorbuddy";

  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  const supabaseCaCert = process.env.SUPABASE_CA_CERT;

  let ssl: { rejectUnauthorized: boolean; ca?: string } | undefined;
  if (supabaseCaCert) {
    ssl = { rejectUnauthorized: true, ca: supabaseCaCert };
  } else if (isProduction) {
    ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool({ connectionString, ssl });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

/**
 * Get or initialize Prisma client (singleton pattern)
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = createTestPrismaClient();
  }
  return prisma;
}

/**
 * Disconnect Prisma client (call in global teardown)
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
