/**
 * Slow Query Monitor - Prisma Client Extension
 * Logs queries exceeding the threshold for performance monitoring.
 *
 * Thresholds:
 * - WARN: >1000ms (logged as warning)
 * - CRITICAL: >3000ms (logged as error)
 *
 * @module db/slow-query-monitor
 */

import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

const SLOW_QUERY_WARN_MS = 1000;
const SLOW_QUERY_CRITICAL_MS = 3000;

/**
 * Creates a Prisma extension that monitors and logs slow queries.
 * Attaches to $allOperations to intercept every database call.
 */
export function createSlowQueryMonitor() {
  return Prisma.defineExtension({
    name: 'slow-query-monitor',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const start = performance.now();
          const result = await query(args);
          const durationMs = Math.round(performance.now() - start);

          if (durationMs >= SLOW_QUERY_CRITICAL_MS) {
            logger.error('[SlowQuery] CRITICAL', {
              model,
              operation,
              durationMs,
              args: summarizeArgs(args),
            });
          } else if (durationMs >= SLOW_QUERY_WARN_MS) {
            logger.warn('[SlowQuery] WARN', {
              model,
              operation,
              durationMs,
              args: summarizeArgs(args),
            });
          }

          return result;
        },
      },
    },
  });
}

/** Summarize query args for logging (avoid PII leakage) */
function summarizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const summary: Record<string, unknown> = {};

  if (args.where) summary.where = Object.keys(args.where as object);
  if (args.take) summary.take = args.take;
  if (args.skip) summary.skip = args.skip;
  if (args.orderBy) summary.orderBy = 'present';
  if (args.include) summary.include = Object.keys(args.include as object);
  if (args.select) summary.select = Object.keys(args.select as object);

  return summary;
}
