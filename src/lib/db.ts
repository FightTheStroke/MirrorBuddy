// ============================================================================
// PRISMA CLIENT SINGLETON
// Prevents multiple instances in development with hot reload
// Uses libSQL adapter for Prisma 7 with SQLite
// ============================================================================

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// Create Prisma adapter with libSQL config
// For local SQLite, use file:// URL. For Turso cloud, use libsql:// URL
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Check if an error is due to missing database tables (not initialized)
 */
export function isDatabaseNotInitialized(error: unknown): boolean {
  const message = String(error);
  return message.includes('no such table') ||
         message.includes('SQLITE_ERROR') ||
         message.includes('does not exist');
}

/**
 * Get a user-friendly error message for database errors
 */
export function getDatabaseErrorMessage(error: unknown): string {
  if (isDatabaseNotInitialized(error)) {
    return 'Database not initialized. Run: npx prisma db push';
  }
  return 'Database error';
}

export default prisma;
