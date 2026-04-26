import { NextResponse } from 'next/server';
import { pipe, withSentry } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';

/**
 * Shields.io endpoint badge for production health
 * @see https://shields.io/endpoint
 */
export const GET = pipe(withSentry('/api/shields/health'))(async () => {
  let healthy = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    healthy = true;
  } catch {
    healthy = false;
  }

  return NextResponse.json(
    {
      schemaVersion: 1,
      label: 'status',
      message: healthy ? 'healthy' : 'degraded',
      color: healthy ? 'brightgreen' : 'red',
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
});
