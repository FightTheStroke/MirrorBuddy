// src/app/api/realtime/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { startRealtimeProxy } from '@/server/realtime-proxy';
import { logger } from '@/lib/logger';
import { getRequestId } from '@/lib/tracing';

export async function GET(request: NextRequest) {
  try {
    startRealtimeProxy();
    const response = NextResponse.json({ status: 'started' });
    response.headers.set('X-Request-ID', getRequestId(request));
    return response;
  } catch (error) {
    logger.error('Failed to start realtime proxy', undefined, error);
    const response = NextResponse.json({ error: 'Failed to start proxy' }, { status: 500 });
    response.headers.set('X-Request-ID', getRequestId(request));
    return response;
  }
}