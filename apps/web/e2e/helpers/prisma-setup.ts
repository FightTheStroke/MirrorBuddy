import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (prisma) return prisma;
  const connectionString = process.env.TEST_DATABASE_URL;
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' || !connectionString) {
    throw new Error('E2E fixtures require an explicit non-production TEST_DATABASE_URL');
  }
  const url = new URL(connectionString);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('E2E fixtures require a local test database');
  }
  const pool = new Pool({ connectionString });
  prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
