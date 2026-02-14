/**
 * School admin stats API
 * Returns aggregated school statistics for the admin dashboard
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';


export const revalidate = 0;
const handler = pipe(
  withSentry('/api/admin/school/stats'),
  withAdmin,
)(async () => {
  const [totalStudents, ssoConfigs] = await Promise.all([
    prisma.profile.count(),
    prisma.schoolSSOConfig.count({ where: { enabled: true } }),
  ]);

  return NextResponse.json({
    totalStudents,
    activeStudents: 0,
    totalSessions: 0,
    ssoEnabled: ssoConfigs > 0,
    tier: 'school',
    subscriptionStatus: 'pilot',
  });
});

export const GET = handler;
