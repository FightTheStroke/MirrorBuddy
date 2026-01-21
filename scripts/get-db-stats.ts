import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/mirrorbuddy';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function getDbStats() {
  try {
    console.log('Fetching database statistics...\n');

    // Get database size
    const sizeResult = await prisma.$queryRaw<Array<{
      database_size: string;
      database_size_bytes: bigint;
      table_count: bigint;
    }>>`
      SELECT
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        pg_database_size(current_database()) as database_size_bytes,
        (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
    `;

    console.log('=== DATABASE SIZE ===');
    console.log(JSON.stringify(sizeResult, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    console.log('');

    // Get table sizes
    const tableSizes = await prisma.$queryRaw<Array<{
      tablename: string;
      size: string;
      size_bytes: bigint;
    }>>`
      SELECT
        tablename,
        pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size,
        pg_total_relation_size('public.'||tablename) as size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size('public.'||tablename) DESC
      LIMIT 15
    `;

    console.log('=== TOP 15 TABLES BY SIZE ===');
    console.log(JSON.stringify(tableSizes, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    console.log('');

    // Get row counts for major tables
    const rowCounts = await prisma.$queryRaw<Array<{
      tablename: string;
      row_estimate: bigint;
    }>>`
      SELECT
        schemaname||'.'||tablename AS tablename,
        n_live_tup AS row_estimate
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
      LIMIT 15
    `;

    console.log('=== ROW COUNTS (TOP 15) ===');
    console.log(JSON.stringify(rowCounts, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getDbStats();
