import { NextResponse } from 'next/server';
import { pipe, withSentry } from '@/lib/api/middlewares';
import { getRequestId } from '@/lib/tracing';

export const revalidate = 0;
export const GET = pipe(withSentry('/api/realtime/start'))(async (ctx) => {
  const response = NextResponse.json(
    { status: 'gone', message: 'WebSocket proxy removed. Voice uses WebRTC GA flow.' },
    { status: 410 },
  );
  response.headers.set('X-Request-ID', getRequestId(ctx.req));
  return response;
});
