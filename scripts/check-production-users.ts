/**
 * Plan 074: Uses shared SSL configuration from src/lib/ssl-config.ts
 */
import { config } from "dotenv";
import { createPrismaClient } from "../src/lib/ssl-config";

config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

const prisma = createPrismaClient();

const KEEP_EMAILS = ["roberdan@fightthestroke.org", "mariodanfts@gmail.com"];

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      createdAt: true,
      isTestData: true,
    },
    orderBy: { createdAt: "desc" },
  });

  console.log("\n=== DATABASE CHECK ===");
  console.log(`Total users: ${users.length}`);
  console.log(`Keep emails: ${KEEP_EMAILS.join(", ")}\n`);

  const toKeep = users.filter((u) => KEEP_EMAILS.includes(u.email));
  const toDelete = users.filter((u) => !KEEP_EMAILS.includes(u.email));

  console.log(`Users to KEEP: ${toKeep.length}`);
  toKeep.forEach((u) =>
    console.log(
      `  ✓ ${u.email} (${u.username}) - ${u.createdAt.toISOString()}`,
    ),
  );

  console.log(`\nUsers to DELETE: ${toDelete.length}`);
  toDelete.forEach((u) =>
    console.log(
      `  ✗ ${u.email} (${u.username}) - ${u.createdAt.toISOString()} - isTestData: ${u.isTestData}`,
    ),
  );

  await prisma.$disconnect();
}

checkUsers().catch(console.error);
