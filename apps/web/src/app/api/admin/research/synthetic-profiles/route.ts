import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';

async function handler() {
  const profiles = await prisma.syntheticProfile.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(profiles);
}

export const GET = pipe(withSentry('/api/admin/research/synthetic-profiles'), withAdmin)(handler);
