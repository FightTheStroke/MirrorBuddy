import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";

config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL not set");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });

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
  await pool.end();
}

checkUsers().catch(console.error);
