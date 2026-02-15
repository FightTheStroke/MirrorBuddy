/**
 * AI/Email Monitoring API Route
 * GET /api/admin/ai-email
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';
import { getAIEmailMetrics } from '@/lib/admin/ai-email-service';

export const revalidate = 0;
export const dynamic = 'force-static';

export const GET = pipe(
  withSentry('/api/admin/ai-email'),
  withAdmin,
)(async (_ctx) => {
  const data = await getAIEmailMetrics();

  return NextResponse.json({ data });
});
