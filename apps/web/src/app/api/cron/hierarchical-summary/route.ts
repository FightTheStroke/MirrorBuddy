// ============================================================================
// CRON JOB - HIERARCHICAL SUMMARY GENERATION
// Generates weekly/monthly summaries for all active users
// Part of Total Memory System (ADR 0082-0090)
// ============================================================================

export const dynamic = 'force-dynamic';

import { pipe, withSentry, withCron } from '@/lib/api/middlewares';
import { runHierarchicalSummarization } from '@/lib/cron/cron-hierarchical-summary';
import { logger } from '@/lib/logger';

/**
 * POST /api/cron/hierarchical-summary
 * Protected by CRON_SECRET for scheduled execution
 *
 * Schedule: Daily at 03:00 UTC
 * - Weekly summaries: Generated for past 7 days if not already exists
 * - Monthly summaries: Generated on 1st of month if not already exists
 */
export const POST = pipe(
  withSentry('/api/cron/hierarchical-summary'),
  withCron,
)(async () => {
  logger.info('Hierarchical summary cron job started');

  // Run the summarization process
  await runHierarchicalSummarization();

  logger.info('Hierarchical summary cron job completed');

  return Response.json({
    success: true,
    message: 'Hierarchical summaries generated',
    timestamp: new Date().toISOString(),
  });
});
