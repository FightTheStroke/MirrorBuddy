// ============================================================================
// PRISMA CLIENT SINGLETON
// Prevents multiple instances in development with hot reload
// Uses Prisma client with PostgreSQL driver adapter
// ============================================================================

import 'server-only';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { logger } from '@/lib/logger';
import { isSupabaseUrl } from '@/lib/utils/url-validation';
import { isStagingMode } from '@/lib/environment/staging-detector';
import { createPIIMiddleware } from '@/lib/db/pii-middleware';
import { createSlowQueryMonitor } from '@/lib/db/slow-query-monitor';
import {
  loadSupabaseCertificate,
  buildSslConfig,
  cleanConnectionString,
} from '@/lib/db/ssl-config';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isE2E = process.env.E2E_TESTS === '1';
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

// SAFETY CHECK: Auto-switch to local PostgreSQL in development
// Prevents accidental writes to production Supabase database
// Override with DEV_DATABASE_URL in .env for custom local setup
const devLocalOverride =
  !isProduction && !isE2E && !!process.env.DATABASE_URL && isSupabaseUrl(process.env.DATABASE_URL);

if (devLocalOverride) {
  logger.warn(
    '[db] Supabase URL detected in development - auto-switching to local PostgreSQL. ' +
      'Set DEV_DATABASE_URL in .env to customize.',
  );
}

// DEBUG: Log environment variables when db.ts loads (E2E only)
if (isE2E) {
  logger.info('[db.ts] E2E_TESTS=1, checking environment variables', {
    hasTestDatabaseUrl: !!testDatabaseUrl,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    testDatabaseUrlSet: testDatabaseUrl ? 'SET' : 'MISSING',
    databaseUrlSet: process.env.DATABASE_URL ? 'SET' : 'MISSING',
  });
}

const connectionString = isE2E
  ? (() => {
      if (!testDatabaseUrl) {
        throw new Error(
          'TEST_DATABASE_URL must be set when E2E_TESTS=1 to avoid using production data.',
        );
      }
      // CRITICAL: Block production Supabase URLs in E2E tests
      if (isSupabaseUrl(testDatabaseUrl)) {
        throw new Error(
          `❌ BLOCKED: E2E test attempted to use production Supabase database!\n` +
            `TEST_DATABASE_URL must be a local test database, not: ${testDatabaseUrl}\n` +
            `This prevents accidental contamination of production data.`,
        );
      }
      // Validate that connection string has credentials
      if (!testDatabaseUrl.includes('@')) {
        throw new Error(`TEST_DATABASE_URL missing credentials (no '@' found): ${testDatabaseUrl}`);
      }
      return testDatabaseUrl;
    })()
  : devLocalOverride
    ? process.env.DEV_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mirrorbuddy'
    : process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mirrorbuddy';

// Load Supabase certificate chain (ADR 0067)
const supabaseCaCert = loadSupabaseCertificate();

// Connection pool configuration optimized for Vercel serverless (ADR 0065)
// Serverless functions are stateless and short-lived, so we minimize idle connections
const pool = new Pool({
  connectionString: cleanConnectionString(connectionString),
  ssl: buildSslConfig(connectionString, isE2E, isProduction, supabaseCaCert),
  max: 5, // Maximum 5 concurrent connections per serverless instance
  min: 0, // No idle connections (serverless cold start every time)
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Timeout after 10 seconds if unable to connect
});

const adapter = new PrismaPg(pool);

const basePrisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// ============================================================================
// STAGING MODE MIDDLEWARE (using Prisma Client Extensions)
// Auto-set isTestData=true for all creates in staging/preview environments
// This prevents test data from polluting production statistics
// ============================================================================

// Models that have isTestData field (must be kept in sync with schema)
// Update this list when adding/removing isTestData from models
const MODELS_WITH_TEST_DATA_FLAG = [
  'User',
  'Conversation',
  'Message',
  'FlashcardProgress',
  'QuizResult',
  'Material',
  'SessionMetrics',
  'UserActivity',
  'TelemetryEvent',
  'StudySession',
  'FunnelEvent',
] as const;

type ModelWithTestData = (typeof MODELS_WITH_TEST_DATA_FLAG)[number];

// Create extension for staging mode auto-tagging
const stagingExtension = basePrisma.$extends({
  name: 'staging-test-data-tagger',
  query: {
    // Apply to all models that have isTestData field
    $allModels: {
      // Intercept create operations
      async create({ model, operation: _operation, args, query }) {
        if (isStagingMode && MODELS_WITH_TEST_DATA_FLAG.includes(model as ModelWithTestData)) {
          args.data = {
            ...args.data,
            isTestData: true,
          };
        }
        return query(args);
      },
      // Intercept createMany operations
      async createMany({ model, operation: _operation2, args, query }) {
        if (isStagingMode && MODELS_WITH_TEST_DATA_FLAG.includes(model as ModelWithTestData)) {
          if (Array.isArray(args.data)) {
            args.data = args.data.map((item: Record<string, unknown>) => ({
              ...item,
              isTestData: true,
            })) as typeof args.data;
          } else {
            args.data = {
              ...args.data,
              isTestData: true,
            };
          }
        }
        return query(args);
      },
    },
  },
});

// ============================================================================
// PII ENCRYPTION MIDDLEWARE (using Prisma Client Extensions)
// Auto-encrypt/decrypt PII fields (email, names) in database operations
// Applied after staging extension to ensure proper chaining
// ============================================================================

const piiMiddleware = createPIIMiddleware();
const piiExtension = stagingExtension.$extends(piiMiddleware);

// ============================================================================
// SLOW QUERY MONITOR (using Prisma Client Extensions)
// Logs queries exceeding 1s (warn) and 3s (critical) for performance monitoring
// ============================================================================

const slowQueryMonitor = createSlowQueryMonitor();
const monitoredClient = piiExtension.$extends(slowQueryMonitor);

// Export the extended client (or base client if already initialized)
// Type assertion is safe because $extends preserves the PrismaClient interface
export const prisma = globalForPrisma.prisma ?? (monitoredClient as unknown as PrismaClient);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export pool for monitoring/metrics (ADR 0067)
// Allows observability layer to track connection pool statistics
export { pool as dbPool };

/**
 * Check if an error is due to missing database tables (not initialized)
 */
export function isDatabaseNotInitialized(error: unknown): boolean {
  const message = String(error);
  return (
    message.includes('does not exist') || message.includes('relation') || message.includes('P2021')
  ); // Prisma error code for missing table
}

/**
 * Get a user-friendly error message for database errors
 */
export function getDatabaseErrorMessage(error: unknown): string {
  if (isDatabaseNotInitialized(error)) {
    return 'Database not initialized. Run: npx prisma migrate deploy';
  }
  return 'Database error';
}

export default prisma;
