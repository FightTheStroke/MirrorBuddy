/**
 * Transient database retry - Prisma Client Extension
 *
 * On 22 Sep 2026 the Supabase pooler answered `{:error, :nxdomain}` for seven
 * minutes while Postgres itself had been up for 237 days with 12 of 60
 * connections in use. Nothing restarted and nothing was overloaded: the path in
 * front of the database went away, and every read in that window became an
 * error in a child's face instead of a one-second pause.
 *
 * Deliberately narrow:
 * - only failures that mean "the database was not reachable", never a query
 *   error, which would just fail slower;
 * - only reads, because a write may have reached the database before the
 *   connection dropped and replaying it could apply it twice;
 * - every retry is logged and a final failure is logged as an error, so an
 *   outage that lasts stays as visible as it was before.
 *
 * @module db/transient-retry
 */

import { Prisma } from '@prisma/client';
import { logger } from '@mirrorbuddy/logger';

const UNREACHABLE_PATTERNS = [
  /:nxdomain/i,
  /:db_connection/i,
  /timed out fetching a new connection/i,
  /connection terminated/i,
  /connection pool/i,
  /etimedout/i,
  /econnreset/i,
  /econnrefused/i,
  /ehostunreach/i,
  /enetunreach/i,
  /eai_again/i,
  /can't reach database server/i,
  /\bP1001\b/,
  /\bP1017\b/,
];

const RETRYABLE_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

const DEFAULT_DELAYS_MS = [250, 750];

/**
 * A failure that took a long time by itself has already spent the request's
 * patience: retrying a 10s connect timeout three times turns a 10s error into
 * a 31s hang, which is worse for the child than a clear failure. The pooler
 * blip this exists for fails in milliseconds.
 */
const DEFAULT_BUDGET_MS = 3000;

export function isTransientDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return UNREACHABLE_PATTERNS.some((pattern) => pattern.test(error.message));
}

export function isRetryableOperation(operation: string): boolean {
  return RETRYABLE_OPERATIONS.has(operation);
}

interface RetryOptions {
  delaysMs?: number[];
  budgetMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function createTransientRetry({
  delaysMs = DEFAULT_DELAYS_MS,
  budgetMs = DEFAULT_BUDGET_MS,
  sleep = defaultSleep,
  now = Date.now,
}: RetryOptions = {}) {
  return Prisma.defineExtension({
    name: 'transient-retry',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          let lastError: unknown;
          let attemptsMade = 0;
          const startedAt = now();

          for (let attempt = 0; attempt <= delaysMs.length; attempt += 1) {
            try {
              attemptsMade += 1;
              return await query(args);
            } catch (caught) {
              lastError = caught;
              const canRetry =
                isTransientDatabaseError(caught) &&
                isRetryableOperation(operation) &&
                attempt < delaysMs.length &&
                now() - startedAt < budgetMs;

              if (!canRetry) break;

              logger.warn('[db] Database unreachable, retrying read', {
                model,
                operation,
                attempt: attempt + 1,
                message: (caught as Error).message,
              });
              await sleep(delaysMs[attempt]);
            }
          }

          if (isTransientDatabaseError(lastError) && isRetryableOperation(operation)) {
            logger.error('[db] Database still unreachable after retries', {
              model,
              operation,
              attempts: attemptsMade,
              message: (lastError as Error).message,
            });
          }

          throw lastError;
        },
      },
    },
  });
}
