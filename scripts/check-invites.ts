/**
 * Quick script to check invite requests in DB
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL || "postgresql://localhost:5432/mirrorbuddy";

const pool = new Pool({
  connectionString,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Checking invite requests...\n");

  const requests = await prisma.inviteRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (requests.length === 0) {
    console.log("No invite requests found in database");
    return;
  }

  console.log(`Found ${requests.length} invite request(s):\n`);
  requests.forEach((r) => {
    console.log(`Email: ${r.email}`);
    console.log(`Name: ${r.name}`);
    console.log(`Status: ${r.status}`);
    console.log(`Created: ${r.createdAt}`);
    console.log("---");
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
