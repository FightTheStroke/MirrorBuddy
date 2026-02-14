/**
 * School registration requests API
 * Returns ContactRequests with type="schools" for admin review
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';


export const revalidate = 0;
const handler = pipe(
  withSentry('/api/admin/school/requests'),
  withAdmin,
)(async () => {
  const requests = await prisma.contactRequest.findMany({
    where: { type: 'schools' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ requests });
});

export const GET = handler;
