/**
 * Business KPI API endpoint for Mission Control
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';
import { getBusinessKPIs } from '@/lib/admin/business-kpi-service';

export const dynamic = 'force-dynamic';

export const GET = pipe(
  withSentry('/api/admin/business-kpi'),
  withAdmin,
)(async (_ctx) => {
  const data = await getBusinessKPIs();

  return NextResponse.json({ data });
});
