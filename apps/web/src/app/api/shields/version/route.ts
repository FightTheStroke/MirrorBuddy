import { NextResponse } from 'next/server';
import { pipe, withSentry } from '@/lib/api/middlewares';
import { getAppVersion } from '@/lib/version';

/**
 * Shields.io endpoint badge for production version
 * @see https://shields.io/endpoint
 */
export const GET = pipe(withSentry('/api/shields/version'))(async () => {
  const version = getAppVersion();

  return NextResponse.json(
    {
      schemaVersion: 1,
      label: 'production',
      message: `v${version}`,
      color: 'blue',
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
});
