/**
 * AI/Email Monitoring API Route
 * GET /api/admin/ai-email
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';
import { getAIEmailMetrics } from '@/lib/admin/ai-email-service';

export const dynamic = 'force-dynamic';

export const GET = pipe(
  withSentry('/api/admin/ai-email'),
  withAdminReadOnly,
)(async (_ctx) => {
  const data = await getAIEmailMetrics();

  return NextResponse.json({ data });
});
