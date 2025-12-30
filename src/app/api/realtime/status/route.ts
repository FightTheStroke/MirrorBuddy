// ============================================================================
// API ROUTE: Check WebSocket Proxy Status
// Returns whether the realtime proxy is running and accepting connections
// ============================================================================

import { NextResponse } from 'next/server';
import { getProxyStatus } from '@/server/realtime-proxy';

export async function GET() {
  try {
    const status = getProxyStatus();

    return NextResponse.json({
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // If getProxyStatus throws, proxy module likely not loaded
    return NextResponse.json({
      running: false,
      port: 3001,
      connections: 0,
      error: 'Proxy module not available',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
