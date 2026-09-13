/**
 * Calculate and Publish Admin Counts
 *
 * Computes admin KPI metrics and publishes via SSE/Redis pub/sub
 * Called when admin-relevant events occur:
 * - Trial budget changes (F-06)
 * - Invite requests change
 * - User signup
 * - System alerts
 *
 * Non-blocking: Errors are logged but don't interrupt calling code
 */

import { getAdminCounts } from './admin-counts-service';
import { logger } from '@/lib/logger';
import { publishAdminCounts } from '@/lib/redis/admin-counts-storage';
import { broadcastAdminCounts } from '@/lib/redis/admin-counts-subscriber';

const log = logger.child({ module: 'calculate-and-publish-admin-counts' });

/**
 * Calculate current admin KPI metrics
 * Used by: admin counts endpoint, trial budget trigger, invite changes, etc.
 *
 * F-06: Excludes test data (isTestData = false) from all counts
 */
/**
 * Calculate and publish admin counts to all connected admins via SSE
 *
 * Non-blocking: If publishing fails, it's logged but doesn't throw
 * This ensures trial budget updates or other events aren't interrupted
 *
 * Called by:
 * - Trial budget changes (incrementBudget trigger)
 * - Invite request changes
 * - User signup
 * - Cron jobs
 * - Direct admin actions
 */
export async function calculateAndPublishAdminCounts(source?: string): Promise<void> {
  try {
    log.debug('Publishing admin counts', { source });

    // Calculate current metrics
    const counts = await getAdminCounts();

    // 1. Store in Redis for initial SSE data
    await publishAdminCounts(counts);

    // 2. Broadcast to all connected SSE clients
    broadcastAdminCounts(counts);

    log.info('Admin counts published successfully', {
      source,
      pendingInvites: counts.pendingInvites,
      totalUsers: counts.totalUsers,
      activeUsers24h: counts.activeUsers24h,
      systemAlerts: counts.systemAlerts,
    });
  } catch (error) {
    // Non-blocking error handling: log but don't throw
    log.warn('Failed to publish admin counts (non-blocking)', {
      source,
      error: String(error),
    });
    // Do not rethrow - calling code should not be affected by SSE push failures
  }
}
