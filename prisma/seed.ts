/**
 * Prisma Database Seeding
 *
 * Main seeding entry point that orchestrates all seed functions.
 * Run with: npx prisma db seed
 * Plan 073: T1-04 - Create seed data: Trial, Base, Pro defaults
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { seedTiers } from "../src/lib/seeds/tier-seed";

/**
 * Create Prisma client with PG adapter
 */
function createPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/mirrorbuddy";

  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  const supabaseCaCert = process.env.SUPABASE_CA_CERT;

  // Build SSL config
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

async function main() {
  const prisma = createPrismaClient();

  try {
    console.log("🌱 Starting database seeding...\n");

    // Seed tiers
    console.log("📚 Seeding tier definitions...");
    const { trial, base, pro } = await seedTiers(prisma);
    console.log("✅ Tiers seeded:", {
      trial: trial.code,
      base: base.code,
      pro: pro.code,
    });

    console.log("\n✨ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
