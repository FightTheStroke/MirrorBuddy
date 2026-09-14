/**
 * Admin Counts API
 *
 * Returns KPI counts for the admin dashboard:
 * - pendingInvites: Number of pending beta requests
 * - totalUsers: Total registered users
 * - activeUsers24h: Unavailable; UserActivity cannot support a 24-hour window
 * - systemAlerts: Number of critical system alerts
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';
import { getAdminCounts } from '@/lib/admin/admin-counts-service';

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/admin/counts'),
  withAdminReadOnly,
)(async () => {
  return NextResponse.json(await getAdminCounts());
});
