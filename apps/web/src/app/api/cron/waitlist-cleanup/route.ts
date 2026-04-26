/**
 * Waitlist Cleanup Cron Job
 *
 * Deletes WaitlistEntry records where verifiedAt IS NULL AND createdAt < 90 days ago.
 * Prevents accumulation of stale unverified signups in the database.
 *
 * Schedule: 0 3 * * * (Daily at 3am UTC)
 * Required env vars:
 *   - CRON_SECRET (for authentication)
 */

export const dynamic = 'force-dynamic';

import { pipe, withSentry, withCron } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const RETENTION_DAYS = 90;

const log = logger.child({ module: 'cron-waitlist-cleanup' });

export const POST = pipe(
  withSentry('/api/cron/waitlist-cleanup'),
  withCron,
)(async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  const result = await prisma.waitlistEntry.deleteMany({
    where: {
      verifiedAt: null,
      createdAt: { lt: cutoffDate },
    },
  });

  log.info('Waitlist cleanup: deleted unverified entries older than 90 days', {
    deleted: result.count,
    cutoffDate: cutoffDate.toISOString(),
  });

  return Response.json({ success: true, deleted: result.count });
});

// Vercel Cron uses GET by default
export const GET = POST;
