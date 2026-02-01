// ============================================================================
// API ROUTE: Check WebSocket Proxy Status
// Returns whether the realtime proxy is running and accepting connections
// ============================================================================

import { NextResponse } from "next/server";
import { pipe, withSentry } from "@/lib/api/middlewares";
import { getProxyStatus } from "@/server/realtime-proxy";

export const GET = pipe(withSentry("/api/realtime/status"))(async () => {
  try {
    const status = getProxyStatus();

    return NextResponse.json({
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // If getProxyStatus throws, proxy module likely not loaded
    return NextResponse.json(
      {
        running: false,
        port: 3001,
        connections: 0,
        error: "Proxy module not available",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
});
