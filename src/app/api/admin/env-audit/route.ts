/**
 * Environment Audit API Route
 *
 * Returns environment variable configuration status for admin settings page.
 * Runs server-side where process.env is available (unlike client components).
 * SECURITY: Never exposes actual values, only set/not-set boolean status.
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';
import { getEnvAudit } from '@/lib/admin/env-audit-service';

export const dynamic = 'force-dynamic';

export const GET = pipe(
  withSentry('/api/admin/env-audit'),
  withAdmin,
)(async () => {
  const audit = getEnvAudit();
  return NextResponse.json(audit);
});
