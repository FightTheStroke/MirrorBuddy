import { NextResponse } from 'next/server';
import { pipe } from '@/lib/api/middleware-utils';
import { withSentry } from '@/lib/api/sentry-middleware';
import { withAdmin } from '@/lib/api/admin-middleware';
import { prisma } from '@/lib/db';

async function handler() {
  const profiles = await prisma.syntheticProfile.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(profiles);
}

export const GET = pipe(withSentry, withAdmin)(handler);
