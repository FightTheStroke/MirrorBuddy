/**
 * Infrastructure Panel API Route
 * Admin-only endpoint for infrastructure metrics
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';
import { getInfraMetrics } from '@/lib/admin/infra-panel-service';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/infra-panel
 * Returns Vercel, Supabase, and Redis metrics
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/admin/infra-panel'),
  withAdminReadOnly,
)(async (ctx) => {
  logger.info('Fetching infrastructure metrics', {
    userId: ctx.userId,
  });

  // Get all infrastructure metrics
  const metrics = await getInfraMetrics();

  return NextResponse.json({
    success: true,
    data: metrics,
  });
});
