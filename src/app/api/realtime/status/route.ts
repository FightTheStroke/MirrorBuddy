// ============================================================================
// API ROUTE: Deprecated WebSocket proxy status endpoint
// Voice now uses WebRTC-only transport
// ============================================================================

import { NextResponse } from 'next/server';
import { pipe, withSentry } from '@/lib/api/middlewares';

export const revalidate = 0;
export const GET = pipe(withSentry('/api/realtime/status'))(async () => {
  return NextResponse.json(
    {
      running: false,
      status: 'gone',
      message: 'Realtime WebSocket proxy removed. Voice runs via WebRTC.',
      timestamp: new Date().toISOString(),
    },
    { status: 410 },
  );
});
