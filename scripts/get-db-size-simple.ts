/**
 * Plan 074: Uses shared SSL configuration from src/lib/ssl-config.ts
 */
import "dotenv/config";
import { createPrismaClient } from "../src/lib/ssl-config";

const prisma = createPrismaClient();

async function getDbSize() {
  try {
    console.log("Fetching database size...\n");

    // Get database size only
    const sizeResult = await prisma.$queryRaw<
      Array<{
        database_size: string;
        database_size_bytes: bigint;
      }>
    >`
      SELECT
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        pg_database_size(current_database()) as database_size_bytes
    `;

    console.log("=== DATABASE SIZE ===");
    console.log(`Current size: ${sizeResult[0].database_size}`);
    console.log(
      `Size in bytes: ${sizeResult[0].database_size_bytes.toString()}`,
    );
    console.log(`Free tier limit: 500 MB`);

    const sizeInMB = Number(sizeResult[0].database_size_bytes) / (1024 * 1024);
    const percentUsed = (sizeInMB / 500) * 100;

    console.log(`Size in MB: ${sizeInMB.toFixed(2)} MB`);
    console.log(`Percentage used: ${percentUsed.toFixed(2)}%`);
    console.log(`Remaining: ${(500 - sizeInMB).toFixed(2)} MB`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

getDbSize();
