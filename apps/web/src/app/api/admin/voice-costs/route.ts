/**
 * Per-user voice costs for the admin console.
 *
 * Read-only, admin-gated, and deliberately the same functions the CLI calls:
 * a dashboard and a script that disagree about the bill are worse than either
 * alone.
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';
import {
  getVoiceSpendByUser,
  getVoiceSpendSummary,
  type Period,
} from '@/lib/metrics/voice-usage-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PERIODS: Period[] = ['day', 'week', 'month'];

export const GET = pipe(
  withSentry('/api/admin/voice-costs'),
  withAdminReadOnly,
)(async (ctx) => {
  const requested = new URL(ctx.req.url).searchParams.get('period');
  const period: Period = PERIODS.includes(requested as Period) ? (requested as Period) : 'day';

  const [summary, users] = await Promise.all([
    getVoiceSpendSummary(period),
    getVoiceSpendByUser(period),
  ]);

  return NextResponse.json({ period, summary, users });
});
