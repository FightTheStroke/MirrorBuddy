/**
 * Cost Tracking API Route
 *
 * Returns aggregated cost data across all providers.
 * Plan 105 - W5-Alerting [T5-04]
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';
import { getCostDashboardData } from '@/lib/ops/cost-tracker';

/**
 * GET - Fetch aggregated cost dashboard data
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/admin/cost-tracking'),
  withAdminReadOnly,
)(async (_ctx) => {
  const data = await getCostDashboardData();
  return NextResponse.json(data);
});
